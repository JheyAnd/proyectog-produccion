# Guía de Despliegue en Producción (Solución a conflicto de rutas)

El problema de que "la URL siempre te lleve al flujo de caja" se debe a que, al generar las aplicaciones para producción (`npm run build`), se generan dos archivos `index.html` distintos (uno para Proyectos y otro para Flujo de Caja). Si en tu servidor Nginx apuntas ambas aplicaciones a la misma carpeta o sobrescribes el contenido, el `index.html` del flujo de caja "gana" y secuestra todas las rutas.

Para solucionarlo, debemos separar las carpetas de ambos proyectos y configurar Nginx para que las sirva en puertos o sub-rutas diferentes.

---

## PASO 1: Compilar (Build) los Proyectos por Separado

Debes construir (build) los proyectos asegurándote de no mezclar sus carpetas `dist/`.

1. **Frontend Principal (Proyectos)**:
   - Abre una terminal en `C:\Users\Jheyson\Documents\GitHub\Proyectog-restructuring\frontend`
   - Ejecuta: `npm run build`
   - Esto generará la carpeta `frontend/dist`.

2. **Microfrontends Secundarios (Flujo de Caja, Caso de Negocio, Cronograma, Dashboard)**:
   - Repite el proceso abriendo una terminal en cada carpeta (`cash-flow-frontend`, `business-case-frontend`, `cronograma-frontend`, `dashboard-frontend`).
   - Ejecuta: `npm run build` en cada una de ellas.
   - Esto generará las respectivas carpetas `dist/`.

> [!IMPORTANT]
> Nunca copies el contenido de los `dist` de los microfrontends dentro de `frontend/dist`. Nginx los leerá de sus ubicaciones originales por separado.

---

## PASO 2: Configurar las Variables de Entorno (.env.production)

El frontend principal necesita saber de dónde descargar los "micro-frontends" en producción.

En la carpeta `frontend/`, crea o edita un archivo llamado `.env.production` e ingresa las rutas donde Nginx servirá los micro-frontends. Si usas puertos incrementales para cada uno (81, 82, 83, 84), el archivo debe verse así:

```env
VITE_CASH_FLOW_REMOTE_URL=http://localhost:81/assets/remoteEntry.js
VITE_BUSINESS_CASE_REMOTE_URL=http://localhost:82/assets/remoteEntry.js
VITE_CRONOGRAMA_REMOTE_URL=http://localhost:83/assets/remoteEntry.js
VITE_DASHBOARD_REMOTE_URL=http://localhost:84/assets/remoteEntry.js
```
*(Luego de hacer esto, debes volver a correr `npm run build` en el frontend principal para que tome estas variables).*

---

## PASO 3: Configurar Nginx (`nginx.conf`)

En tu servidor de Windows, ve a la carpeta de instalación de Nginx (usualmente `C:\nginx\conf\`) y abre el archivo `nginx.conf` en un bloc de notas.

Borra la configuración actual del bloque `server { ... }` que está causando problemas, y usa esta estructura. Esta configuración usa el **Puerto 80** para Proyectos, los puertos del **81 al 84** para los demás Microfrontends, y redirige las rutas `/api` a los backends de Python correspondientes.

```nginx
http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;

    # ----------------------------------------------------
    # SERVIDOR 1: FRONTEND PRINCIPAL (PROYECTOS) - PUERTO 80
    # ----------------------------------------------------
    server {
        listen       80;
        server_name  localhost;

        # 1. Archivos estáticos de Proyectos
        location / {
            # PON AQUÍ LA RUTA EXACTA A TU CARPETA DIST DEL FRONTEND PRINCIPAL
            root   C:/Users/Jheyson/Documents/GitHub/Proyectog-restructuring/frontend/dist;
            index  index.html index.htm;
           
            # Esto es vital para que React Router funcione al recargar la página
            try_files $uri $uri/ /index.html;
        }

        # 2. Redirección de APIs (Proxy Reverso al Backend de Python)
        location /api/v1/cash-flow/ {
            proxy_pass http://127.0.0.1:8026;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /api/v1/business-case/ {
            proxy_pass http://127.0.0.1:8027;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /api/v1/cronograma/ {
            proxy_pass http://127.0.0.1:8028;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /api/ {
            proxy_pass http://127.0.0.1:8025;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }

    # ----------------------------------------------------
    # SERVIDOR 2: FLujo DE CAJA (MICRO-FRONTEND) - PUERTO 81
    # ----------------------------------------------------
    server {
        listen       81;
        server_name  localhost;

        # Habilitar CORS para que el puerto 80 pueda descargar los archivos JS
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';

        location / {
            root   C:/Users/Jheyson/Documents/GitHub/Proyectog-restructuring/cash-flow-frontend/dist;
            index  index.html index.htm;
            try_files $uri $uri/ /index.html;
        }
    }

    # (Debes repetir el bloque del Servidor 2 para los puertos 82, 83 y 84,
    # apuntando a business-case-frontend, cronograma-frontend y dashboard-frontend respectivamente)
}
```

---

## PASO 4: Reiniciar Nginx

Una vez que guardes el archivo `nginx.conf`:
1. Abre tu terminal (Símbolo de sistema o PowerShell) como Administrador.
2. Ve a la carpeta donde tienes nginx (ej: `cd C:\nginx`).
3. Ejecuta el comando para recargar la configuración:
   ```cmd
   nginx -s reload
   ```
   *(Si el comando de arriba falla porque Nginx está apagado, simplemente ejecuta `start nginx`)*.

---

### En Resumen:
- Si entras a `http://localhost/` verás el **Dashboard de Proyectos**. Nginx buscará el `index.html` de `frontend/dist`.
- Ese Dashboard intentará buscar internamente los Microfrontends haciendo peticiones a `http://localhost:81`, `82`, `83`, `84`.
- Nginx recibe las peticiones en esos puertos y entrega exitosamente el código desde cada carpeta `dist` sin mezclar ni sobrescribir las páginas.
