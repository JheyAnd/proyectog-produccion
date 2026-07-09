@echo off
chcp 65001 >nul
echo ========================================
echo FORZANDO CIERRE DE SERVICIOS EN PRODUCCION
echo ========================================
echo.
echo Matando procesos de Python (Backend)...
taskkill /F /IM python.exe /T >nul 2>&1
taskkill /F /IM uvicorn.exe /T >nul 2>&1

echo Matando procesos de Node (Frontend)...
taskkill /F /IM node.exe /T >nul 2>&1

echo Matando procesos de NGINX...
taskkill /F /IM nginx.exe /T >nul 2>&1

echo.
echo Procesos limpiados correctamente de la memoria.
echo Por favor, ejecuta INICIAR_APP.bat de nuevo.
echo.
pause
