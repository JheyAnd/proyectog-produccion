# Diseño Arquitectónico: Motor de Simulación y Proyección de Cronogramas

Este documento define la arquitectura y el modelo de datos para un motor de simulación genérico y reutilizable aplicado a cronogramas de proyectos. El motor calcula indicadores de rendimiento (SPI) y proyecta la Curva S (EVM - Earned Value Management) en un entorno de sandbox aislado.

---

## 1. Modelo de Datos Universal (Input JSON)

Para que el motor sea agnóstico al proyecto, el JSON de entrada debe estructurarse en tres secciones clave:
1. **Metadatos del Proyecto**: Fechas globales y unidad de control (semanas, meses, etc.).
2. **Línea de Tiempo (Periodos)**: Los cortes de control temporales.
3. **Actividades (Hojas)**: Los nodos finales de la WBS (Work Breakdown Structure) con su peso, fechas de ejecución, avance real y su planificación periódica (línea base).

### Estructura del JSON Genérico (`input_schedule.json`)

```json
{
  "project_metadata": {
    "project_id": "proj-uuid-12345",
    "name": "Proyecto de Infraestructura Patio Sur",
    "start_date": "2026-01-05",
    "end_date": "2026-05-24",
    "control_unit": "WEEKLY",
    "total_value_cop": 1500000000.00
  },
  "periods": [
    {"index": 1, "label": "Semana 1", "date": "2026-01-11"},
    {"index": 2, "label": "Semana 2", "date": "2026-01-18"},
    {"index": 3, "label": "Semana 3", "date": "2026-01-25"},
    {"index": 4, "label": "Semana 4", "date": "2026-02-01"}
  ],
  "activities": [
    {
      "activity_id": "act-001",
      "name": "Obras Civiles y Cimentación",
      "weight": 0.35,
      "start_date": "2026-01-05",
      "end_date": "2026-02-15",
      "actual_progress": 0.85,
      "baseline_progress_distribution": [
        {"period_index": 1, "planned_progress": 0.10},
        {"period_index": 2, "planned_progress": 0.30},
        {"period_index": 3, "planned_progress": 0.60},
        {"period_index": 4, "planned_progress": 0.90}
      ]
    },
    {
      "activity_id": "act-002",
      "name": "Montaje de Estructuras Metálicas",
      "weight": 0.40,
      "start_date": "2026-01-19",
      "end_date": "2026-04-12",
      "actual_progress": 0.45,
      "baseline_progress_distribution": [
        {"period_index": 1, "planned_progress": 0.00},
        {"period_index": 2, "planned_progress": 0.00},
        {"period_index": 3, "planned_progress": 0.05},
        {"period_index": 4, "planned_progress": 0.15}
      ]
    },
    {
      "activity_id": "act-003",
      "name": "Instalaciones Eléctricas y Cableado",
      "weight": 0.25,
      "start_date": "2026-02-09",
      "end_date": "2026-05-24",
      "actual_progress": 0.00,
      "baseline_progress_distribution": [
        {"period_index": 1, "planned_progress": 0.00},
        {"period_index": 2, "planned_progress": 0.00},
        {"period_index": 3, "planned_progress": 0.00},
        {"period_index": 4, "planned_progress": 0.00}
      ]
    }
  ]
}
```

> [!NOTE]
> * **`weight` ($W_i$)**: Representa la fracción del peso relativo de la actividad sobre el proyecto total. La suma de los pesos de todas las actividades debe ser exactamente `1.0` (100%).
> * **`planned_progress`**: Representa el avance **acumulado** planificado para esa actividad en ese periodo específico (valores de `0.0` a `1.0`).

---

## 2. Motor de Recálculo Dinámico

El backend recalcula dinámicamente el avance del proyecto total para cualquier periodo $T$ usando las siguientes formulaciones matemáticas:

### A. Avance Planificado Acumulado del Proyecto ($AP_T$)
Es la suma ponderada del avance planificado de cada actividad en el periodo $T$:
$$AP_T = \sum_{i=1}^{N} (W_i \times \text{planned\_progress}_{i, T})$$

### B. Avance Real Acumulado del Proyecto ($AR_T$)
Para el periodo actual de corte (digamos, $T_{corte}$), el avance real del proyecto es la suma ponderada del avance real de cada actividad cargado en el sistema:
$$AR_{T_{corte}} = \sum_{i=1}^{N} (W_i \times \text{actual\_progress}_i)$$

### C. Schedule Performance Index ($SPI$)
El SPI global del proyecto en el corte se calcula como:
$$SPI = \frac{AR_{T_{corte}}}{AP_{T_{corte}}}$$

* **$SPI > 1.0$**: Adelanto en cronograma.
* **$SPI = 1.0$**: A tiempo.
* **$SPI < 1.0$**: Retraso en cronograma.

---

## 3. Algoritmo de Proyección (Forecasting) y Control de Fronteras

Para proyectar la Curva S real hacia periodos futuros ($T > T_{corte}$), el motor aplica el factor de rendimiento actual ($SPI$) sobre las actividades restantes:

1. **Rendimiento Constante (Fórmula Básica de Proyección)**:
   Se asume que la velocidad de trabajo futura se mantendrá igual al rendimiento acumulado actual ($SPI_{actual}$):
   $$AR_{T} = AR_{T_{corte}} + (AP_{T} - AP_{T_{corte}}) \times SPI_{actual}$$

2. **Rendimiento Corregido por Actividad**:
   Para mayor precisión, se calcula la proyección a nivel de actividad $i$:
   $$\text{projected\_progress}_{i, T} = \text{actual\_progress}_i + (\text{planned\_progress}_{i, T} - \text{planned\_progress}_{i, T_{corte}}) \times SPI_{actual}$$

### A. Control de Fronteras Matemática (Clamping)
Para evitar distorsiones en las proyecciones visuales, el motor aplica límites estrictos al avance de cada actividad:
* **Límite Superior (Saturación)**: El avance proyectado acumulado se satura en 1.0 (100%). Si la proyección matemática da un valor mayor (por ir adelantado con $SPI > 1.0$), se limita usando la función:
  $$\text{projected\_progress}_{i, T} = \min(\text{projected\_progress}_{i, T}, 1.0)$$
* **Límite Inferior (Monotonía)**: El avance acumulado no puede retroceder ni decrementarse. El avance acumulado de periodos futuros siempre debe ser mayor o igual al avance del periodo de corte:
  $$\text{projected\_progress}_{i, T} = \max(\text{projected\_progress}_{i, T}, \text{actual\_progress}_i)$$

### B. Distribución del Avance Real Histórico ($T < T_{corte}$)
Cuando el JSON provee el avance real acumulado a la fecha actual (`actual_progress` en $T_{corte}$) y no se cuenta con el historial exacto de reportes de cortes pasados, el motor realiza una **distribución proporcional**:
* El avance real se distribuye en los periodos pasados ($T \le T_{corte}$) replicando la misma forma y pendiente de la curva planificada de la actividad:
  $$\text{real\_progress}_{i, T} = \text{actual\_progress}_i \times \left( \frac{\text{planned\_progress}_{i, T}}{\text{planned\_progress}_{i, T_{corte}}} \right)$$
* Esto permite pintar la curva histórica real (línea continua hasta la fecha de corte) de forma suave, lógica y coherente a nivel visual en la gráfica sin necesidad de almacenar bitácoras históricas pesadas en el JSON de entrada.

---

## 4. Aislamiento del Estado (Sandbox) y Escalabilidad

Para realizar simulaciones de forma veloz y ligera sin alterar los datos reales "En Vivo":

* **Simulaciones Volátiles (En Memoria)**: El cliente envía el JSON con las modificaciones temporales a un endpoint `POST /api/v1/simulations/calculate`. El backend realiza los cálculos matemáticos en memoria de forma inmediata y retorna la respuesta. No se realiza ninguna persistencia en base de datos.
* **Simulaciones Guardadas (Estrategia de Deltas)**:
  Para persistir una simulación (ej. "Escenario Optimista de Lluvias"), en lugar de duplicar todo el cronograma con sus cientos de actividades en la base de datos (lo cual causaría redundancia y lentitud), se almacena únicamente un registro de **Deltas de Modificación** en la tabla relacional `cronograma_simulacion_detalles`:
  
  ```sql
  -- Tabla para guardar los metadatos de la simulación
  CREATE TABLE cronograma_simulaciones (
      id VARCHAR(50) PRIMARY KEY,
      project_id VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_by VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Tabla para guardar únicamente los deltas simulados
  CREATE TABLE cronograma_simulacion_detalles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      simulacion_id VARCHAR(50) NOT NULL,
      activity_id VARCHAR(50) NOT NULL,
      simulated_progress DECIMAL(5,2) NOT NULL, -- El % de avance modificado (ej. 0.85)
      FOREIGN KEY (simulacion_id) REFERENCES cronograma_simulaciones(id) ON DELETE CASCADE
  );
  ```
  
  * **Carga de Simulación**: Al cargar la simulación, el backend recupera el cronograma base "En Vivo", y en memoria sobrepone los deltas almacenados en `cronograma_simulacion_detalles` antes de pasar la estructura al motor de recálculo. Esto garantiza consultas ultra rápidas, almacenamiento ligero e integridad de datos.

