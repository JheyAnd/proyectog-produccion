@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ========================================
REM SCRIPT PARA INSTALAR SERVICIOS NSSM
REM IMPORTANTE: EJECUTAR COMO ADMINISTRADOR
REM ========================================

net session >nul 2>&1
if %errorLevel% == 0 (
    echo Permisos de administrador confirmados.
) else (
    echo [ERROR] Este script requiere permisos de Administrador.
    echo Por favor, haz clic derecho en el archivo y selecciona "Ejecutar como administrador".
    pause
    exit /b 1
)

cd /d "%~dp0"
set PROJECT_DIR=%~dp0

echo.
echo ========================================
echo CREANDO SERVICIOS BACKEND CON NSSM
echo ========================================
echo Asegurate de que nssm.exe esta instalado y en el PATH.
echo.

REM --- Servicio CORE (8029) ---
echo Instalando Proyectog-Core (Puerto 8029)...
nssm stop Proyectog-Core >nul 2>&1
nssm remove Proyectog-Core confirm >nul 2>&1
nssm install Proyectog-Core "%PROJECT_DIR%backend\.venv_win\Scripts\python.exe" "-m uvicorn src.main:app --host 127.0.0.1 --port 8029"
nssm set Proyectog-Core AppDirectory "%PROJECT_DIR%backend"
nssm start Proyectog-Core

REM --- Servicio CASH FLOW (8030) ---
echo Instalando Proyectog-CashFlow (Puerto 8030)...
nssm stop Proyectog-CashFlow >nul 2>&1
nssm remove Proyectog-CashFlow confirm >nul 2>&1
nssm install Proyectog-CashFlow "%PROJECT_DIR%backend\.venv_win\Scripts\python.exe" "-m uvicorn src.main:app --host 127.0.0.1 --port 8030"
nssm set Proyectog-CashFlow AppDirectory "%PROJECT_DIR%cash-flow-service"
nssm start Proyectog-CashFlow

REM --- Servicio BUSINESS CASE (8031) ---
echo Instalando Proyectog-BusinessCase (Puerto 8031)...
nssm stop Proyectog-BusinessCase >nul 2>&1
nssm remove Proyectog-BusinessCase confirm >nul 2>&1
nssm install Proyectog-BusinessCase "%PROJECT_DIR%backend\.venv_win\Scripts\python.exe" "-m uvicorn src.main:app --host 127.0.0.1 --port 8031"
nssm set Proyectog-BusinessCase AppDirectory "%PROJECT_DIR%business-case-service"
nssm start Proyectog-BusinessCase

REM --- Servicio CRONOGRAMA (8032) ---
echo Instalando Proyectog-Cronograma (Puerto 8032)...
nssm stop Proyectog-Cronograma >nul 2>&1
nssm remove Proyectog-Cronograma confirm >nul 2>&1
nssm install Proyectog-Cronograma "%PROJECT_DIR%backend\.venv_win\Scripts\python.exe" "-m uvicorn src.main:app --host 127.0.0.1 --port 8032"
nssm set Proyectog-Cronograma AppDirectory "%PROJECT_DIR%cronograma-service"
nssm start Proyectog-Cronograma

echo.
echo ========================================
echo INSTALACION DE SERVICIOS COMPLETADA
echo ========================================
echo.
echo PASO MANUAL REQUERIDO PARA NGINX:
echo Por favor, copia el contenido de "proyectog_nginx.conf" y pegalo
echo al final del bloque "http { ... }" en tu archivo C:\nginx\conf\nginx.conf
echo Despues de guardarlo, reinicia nginx ejecutando: nginx -s reload
echo.
pause
