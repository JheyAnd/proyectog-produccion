@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ========================================
echo CONSTRUYENDO MICROFRONTENDS PARA PRODUCCION
echo ========================================

echo.
echo 1/5 - Compilando Cash Flow...
cd cash-flow-frontend
call npm run build
if errorlevel 1 (echo Error en Cash Flow && pause && exit /b 1)
cd ..

echo.
echo 2/5 - Compilando Business Case...
cd business-case-frontend
call npm run build
if errorlevel 1 (echo Error en Business Case && pause && exit /b 1)
cd ..

echo.
echo 3/5 - Compilando Cronograma...
cd cronograma-frontend
call npm run build
if errorlevel 1 (echo Error en Cronograma && pause && exit /b 1)
cd ..

echo.
echo 4/5 - Compilando Dashboard...
cd dashboard-frontend
call npm run build
if errorlevel 1 (echo Error en Dashboard && pause && exit /b 1)
cd ..

echo.
echo 5/5 - Compilando Frontend Shell...
cd frontend
call npm run build
if errorlevel 1 (echo Error en Frontend Shell && pause && exit /b 1)
cd ..

echo.
echo ========================================
echo COMPILACION FINALIZADA CON EXITO
echo ========================================
pause
