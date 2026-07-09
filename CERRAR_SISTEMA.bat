@echo off
echo ========================================
echo CERRANDO TODOS LOS PROCESOS DEL SISTEMA
echo ========================================
echo.
echo Esto cerrara todas las ventanas de Node (Frontend) y Python (Backend) abiertas.
echo.

taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM uvicorn.exe >nul 2>&1

echo Cerrando ventanas de terminal...
taskkill /F /FI "WINDOWTITLE eq BACKEND - Patio Sur*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq FRONTEND - Patio Sur*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq MFE*" >nul 2>&1

echo.
echo Puertos liberados y sistema cerrado correctamente.
echo Ya puedes volver a correr INICIAR_APP.bat de forma limpia.
echo.
pause
