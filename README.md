# Sistema de Gestión de Proyectos — PC Mejía

Sistema web avanzado de control y seguimiento de proyectos de infraestructura eléctrica. Permite gestionar de manera integral múltiples proyectos, presupuesto, WBS, flujo de caja, casos de negocio, facturas, transacciones, alertas y documentos entregables, utilizando una arquitectura moderna orientada a microservicios y microfrontends.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18 + TypeScript + Tailwind CSS |
| **Arquitectura UI** | Vite 5 + Module Federation (Microfrontends) |
| **Backend** | Python (FastAPI) + SQLAlchemy 2.0 (async) + Alembic |
| **Base de datos** | MySQL 8 (aiomysql) |
| **Autenticación** | JWT (HS256) con Control de Acceso Basado en Roles (RBAC) |
| **Gráficos** | Recharts (ComposedChart) |

---

## Arquitectura de Microfrontends y Microservicios

El sistema está dividido en múltiples módulos independientes que se comunican entre sí para brindar una experiencia de usuario unificada (aplicación *Shell*) sin acoplar el código.

### 🌐 Frontend (Puertos 517x)
1. **Frontend Principal (Shell) — Puerto 5173**: Es el esqueleto de la aplicación. Maneja el inicio de sesión, el menú lateral superior y las rutas principales. Su trabajo es "inyectar" dinámicamente las demás aplicaciones dentro de sí mismo.
2. **Microfront Flujo de Caja (Remote) — Puerto 5174**: Aplicación independiente de React que sirve únicamente las pantallas y componentes del Flujo de Caja.
3. **Microfront Caso de Negocio (Remote) — Puerto 5175**: Aplicación independiente de React enfocada exclusivamente en el Caso de Negocio de los proyectos.
4. **Microfront Cronograma (Remote) — Puerto 5176**: Aplicación independiente de React enfocada en la planificación y seguimiento del cronograma del proyecto.
5. **Microfront Dashboard Global (Remote) — Puerto 5177**: Aplicación independiente de React que consolida los reportes e indicadores clave de rendimiento (KPIs).

### ⚙️ Backend (Puertos 802x)
La API está transicionando de un monolito a una arquitectura orientada a microservicios:
1. **API Monolito (Core) — Puerto 8025**: Maneja la autenticación, proyectos, usuarios, reportes, alertas y almacenamiento general de entregables.
2. **Microservicio Flujo de Caja — Puerto 8026**: Servicio dedicado a la lógica de negocio y consolidación matemática del flujo de caja.
3. **Microservicio Caso de Negocio — Puerto 8027**: Servicio dedicado al manejo de los presupuestos de costos, ventas, análisis de IA y la carga de matrices (Excel).
4. **Microservicio Cronograma — Puerto 8028**: Servicio dedicado a la lógica y almacenamiento de datos del cronograma.

---

## Requisitos previos

- **Python 3.11+**
- **Node.js 18+**
- **MySQL 8** (corriendo y accesible)
- Instalación de dependencias de Python: `pip install -r backend/requirements.txt`
- Instalación de dependencias de NPM (debe hacerse en todas las carpetas del frontend):
  - `cd frontend && npm install`
  - `cd cash-flow-frontend && npm install`
  - `cd business-case-frontend && npm install`
  - `cd cronograma-frontend && npm install`
  - `cd dashboard-frontend && npm install`

---

## Ejecutar la Aplicación Localmente

Para simplificar el entorno de desarrollo local con todos los microfrontends y microservicios, se han creado scripts automatizados para Windows:

### 🚀 Iniciar todo el sistema
Simplemente haz doble clic en el archivo **`INICIAR_APP.bat`** ubicado en la raíz del proyecto.
El script se encargará de:
1. Levantar el Backend Core (8025).
2. Levantar los microservicios de Cash Flow (8026) y Business Case (8027).
3. Compilar en modo `watch` y servir (`preview`) los Microfrontends (5174, 5175).
4. Levantar el Frontend Shell (5173).

> **Nota:** Todos los `vite.config.ts` cuentan con la propiedad `strictPort: true` para evitar que Vite tome puertos diferentes a los programados si estos llegan a estar ocupados en segundo plano.

### 🛑 Detener el sistema (Limpieza)
Si necesitas reiniciar el sistema o si los puertos quedaron ocupados por un cierre accidental de las ventanas de comandos, ejecuta:
**`CERRAR_SISTEMA.bat`**

Esto forzará el cierre de todas las instancias "fantasma" de `node.exe` y `python.exe` liberando todos los puertos inmediatamente.

---

## Base de Datos y Migraciones (Alembic)

La base de datos `proyectog` debe existir en el servidor MySQL antes de arrancar la aplicación.
Las tablas se crean y migran automáticamente con Alembic al iniciar el backend (en el *lifespan* de la app principal).

```sql
CREATE DATABASE IF NOT EXISTS proyectog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

El proyecto usa **Alembic** para gestionar el esquema de la base de datos.
Ruta de migraciones: `backend/src/infrastructure/database/migrations/versions/`

### Comandos útiles de Alembic
```bash
# Entrar al entorno virtual
cd backend
.\.venv_win\Scripts\activate

# Aplicar todas las migraciones pendientes
alembic upgrade head

# Crear una nueva migración cuando modifiques los modelos de SQLAlchemy
alembic revision --autogenerate -m "descripcion de tus cambios"
```

---

## Roles de Usuario y Accesos (RBAC)

El sistema soporta acceso basado en roles para asegurar la confidencialidad de la información financiera:

| Rol | Permisos |
|-----|---------|
| `gerente` | Acceso completo de escritura y lectura a todas las funciones. |
| `controller` | Gestión financiera, revisión de facturas, flujos y reportes. |
| `ingeniero` | Gestión de la obra técnica, transacciones operativas y entregables. |
| `viewer` | Solo lectura en todas las vistas, sin permisos para crear, editar o eliminar. |

---

## Despliegue en Producción

La aplicación en producción utiliza un balanceador/proxy reverso (**Nginx** / Cloud) para servir unidamente las APIs y los archivos estáticos precompilados de los distintos microfrontends. Los microservicios de backend deberán correr a través de un orquestador (ej. Docker, PM2) y Nginx debe rutear el tráfico según los prefijos (ej. `/api/v1/cash-flow` hacia el puerto 8026).
