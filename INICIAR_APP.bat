@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ========================================
echo INICIANDO SISTEMA PATIO SUR
echo ========================================
echo.

REM Verificar si npm esta disponible
call npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm no esta instalado
    pause
    exit /b 1
)

echo [OK] npm disponible

REM Crear ventanas separadas para backend y frontend
echo.
echo Iniciando Backend en puerto 8029...
start "BACKEND - Patio Sur" cmd /k "cd backend && .venv_win\Scripts\python.exe -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8029"

ping 127.0.0.1 -n 4 >nul

echo Iniciando MFE API (Cash Flow) en puerto 8030...
start "MFE API - Cash Flow" cmd /k "cd cash-flow-service && ..\backend\.venv_win\Scripts\python.exe -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8030"

ping 127.0.0.1 -n 4 >nul

echo Iniciando MFE UI (Cash Flow) en puerto 5130...
start "MFE UI - Cash Flow (Watch)" cmd /k "cd cash-flow-frontend && npm run build -- --mode development --watch --emptyOutDir false"
start "MFE UI - Cash Flow (Preview)" cmd /k "cd cash-flow-frontend && ping 127.0.0.1 -n 4 >nul && npm run preview"

ping 127.0.0.1 -n 4 >nul

echo Iniciando MFE API (Business Case) en puerto 8031...
start "MFE API - Business Case" cmd /k "cd business-case-service && ..\backend\.venv_win\Scripts\python.exe -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8031"

ping 127.0.0.1 -n 4 >nul

echo Iniciando MFE UI (Business Case) en puerto 5131...
start "MFE UI - Business Case (Watch)" cmd /k "cd business-case-frontend && npm run build -- --mode development --watch --emptyOutDir false"
start "MFE UI - Business Case (Preview)" cmd /k "cd business-case-frontend && ping 127.0.0.1 -n 4 >nul && npm run preview"

ping 127.0.0.1 -n 4 >nul

echo Iniciando MFE API (Cronograma) en puerto 8032...
start "MFE API - Cronograma" cmd /k "cd cronograma-service && ..\backend\.venv_win\Scripts\python.exe -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8032"

ping 127.0.0.1 -n 4 >nul

echo Iniciando MFE UI (Cronograma) en puerto 5132...
start "MFE UI - Cronograma (Watch)" cmd /k "cd cronograma-frontend && npm run build -- --mode development --watch --emptyOutDir false"
start "MFE UI - Cronograma (Preview)" cmd /k "cd cronograma-frontend && ping 127.0.0.1 -n 4 >nul && npm run preview"

ping 127.0.0.1 -n 4 >nul

echo Iniciando MFE UI (Dashboard Global) en puerto 5133...
start "MFE UI - Dashboard Global (Watch)" cmd /k "cd dashboard-frontend && npm run build -- --mode development --watch --emptyOutDir false"
start "MFE UI - Dashboard Global (Preview)" cmd /k "cd dashboard-frontend && ping 127.0.0.1 -n 4 >nul && npm run preview"

ping 127.0.0.1 -n 4 >nul

echo Iniciando Frontend (Shell) en puerto 5129...
start "FRONTEND - Patio Sur" cmd /k "cd frontend && npm run dev"

ping 127.0.0.1 -n 6 >nul

echo.
echo ========================================
echo SISTEMA INICIADO
echo ========================================
echo.
echo [OK] Backend corriendo en: http://localhost:8029
echo [OK] Frontend corriendo en: http://localhost:5129
echo.
echo [INSTRUCCIONES]
echo 1. En unos segundos se abrira el navegador
echo 2. Si no se abre, ve a: http://localhost:5129
echo 3. Ingresa:
echo    Email: rosmel.pernia@pcmejia.com.co
echo    Contrasena: 12345678
echo 4. NO cierres estas ventanas mientras uses la app
echo.
echo ========================================
echo.

ping 127.0.0.1 -n 3 >nul

REM Abrir navegador
start "" http://localhost:5129

pause
