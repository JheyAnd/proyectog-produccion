# Sistema de Gestión de Proyectos de Producción — PC Mejía

Sistema web avanzado de control y seguimiento de proyectos de infraestructura eléctrica para **producción**. Permite gestionar de manera integral múltiples proyectos, presupuestos, WBS, flujos de caja, casos de negocio, facturas, transacciones, alertas y documentos entregables, utilizando una arquitectura moderna orientada a microservicios y microfrontends.

Este repositorio está configurado de forma independiente para operar en el entorno de **producción** utilizando puertos aislados y apuntando a la base de datos `proyectog-produccion`.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18 + TypeScript + Vanilla CSS |
| **Arquitectura UI** | Vite 6 + Module Federation (Microfrontends) |
| **Backend** | Python (FastAPI) + SQLAlchemy 2.0 (async) + Alembic |
| **Base de datos** | MySQL 8 (aiomysql) |
| **Autenticación** | JWT (HS256) con Control de Acceso Basado en Roles (RBAC) |
| **Gráficos** | Recharts (ComposedChart) |

---

## Arquitectura de Microfrontends y Microservicios (Puertos de Producción)

El sistema está estructurado con una arquitectura modular para desarrollo y despliegue desacoplado. Los puertos han sido reconfigurados de forma independiente para arrancar a partir del número **29** para evitar colisiones con entornos locales de desarrollo o pruebas.

### 🌐 Frontend (Puertos 512x / 513x)
1. **Frontend Principal (Shell) — Puerto 5129**: Es el esqueleto de la aplicación. Maneja el inicio de sesión, el menú lateral superior y las rutas principales. Su trabajo es inyectar dinámicamente las demás aplicaciones remotas.
2. **Microfront Flujo de Caja (Remote) — Puerto 5130**: Sirve las pantallas y componentes del Flujo de Caja.
3. **Microfront Caso de Negocio (Remote) — Puerto 5131**: Pantallas y formularios del Caso de Negocio de los proyectos.
4. **Microfront Cronograma (Remote) — Puerto 5132**: Planificación y visualización de la curva S y avances semanales.
5. **Microfront Dashboard Global (Remote) — Puerto 5133**: Consolida los reportes e indicadores clave de rendimiento (KPIs).

### ⚙️ Backend (Puertos 802x / 803x)
1. **API Monolito (Core) — Puerto 8029**: Autenticación, proyectos, usuarios, reportes, alertas y almacenamiento general de entregables.
2. **Microservicio Flujo de Caja — Puerto 8030**: Lógica de negocio y consolidación matemática del flujo de caja.
3. **Microservicio Caso de Negocio — Puerto 8031**: Presupuestos de costos, ventas, análisis de IA y carga de matrices (Excel).
4. **Microservicio Cronograma — Puerto 8032**: Datos, semanas y lógica del cronograma.

---

## Requisitos Previos

- **Python 3.11+**
- **Node.js 18+**
- **MySQL 8** (corriendo y accesible)
- Instalación de dependencias de Python: `pip install -r backend/requirements.txt`
- Instalación de dependencias de NPM (ejecutar `npm install` en cada directorio):
  - `cd frontend && npm install`
  - `cd cash-flow-frontend && npm install`
  - `cd business-case-frontend && npm install`
  - `cd cronograma-frontend && npm install`
  - `cd dashboard-frontend && npm install`

---

## Ejecutar la Aplicación Localmente (Producción)

Los scripts automatizados han sido modificados para levantar el entorno utilizando los nuevos puertos:

### 🚀 Iniciar todo el sistema
Haz doble clic en **`INICIAR_APP.bat`** en la raíz.
El script levantará de forma ordenada:
1. El Backend Core en el puerto **`8029`**.
2. Los microservicios en los puertos **`8030`**, **`8031`** y **`8032`**.
3. Los Microfrontends en los puertos de desarrollo y previsualización.
4. El Frontend Shell en el puerto **`5129`** y abrirá el navegador automáticamente.

### 🛑 Detener el sistema (Limpieza)
Ejecuta **`CERRAR_SISTEMA.bat`** en la raíz para cerrar todas las instancias huérfanas de node y python en los puertos de producción.

---

## Base de Datos y Migraciones (Alembic)

La base de datos se llama **`proyectog-produccion`** en MySQL. Debe crearse previamente en el servidor:

```sql
CREATE DATABASE IF NOT EXISTS `proyectog-produccion` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Las migraciones de tablas se aplican automáticamente al iniciar el backend. Si requieres aplicarlas manualmente:
```bash
cd backend
.\.venv_win\Scripts\activate
alembic upgrade head
```

---

## Repositorio Oficial
* **GitHub Remote URL**: `https://github.com/JheyAnd/proyectog-produccion.git`
