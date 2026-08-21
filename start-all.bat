@echo off
setlocal

cd /d "%~dp0"

echo =========================================================
echo Starting Corporate Crisis Resource Allocation System...
echo =========================================================

if not exist "backend\crisis_server.exe" (
    echo [1/2] Backend executable not found. Building backend...
    pushd "backend"
    call build.bat
    if errorlevel 1 (
        popd
        echo [ERROR] Backend build failed.
        exit /b %errorlevel%
    )
    popd
) else (
    echo [1/2] Backend executable found. Skipping build.
)

echo [2/2] Launching backend and frontend...
start "CCRAS Backend" cmd /k "cd /d "%~dp0" && backend\crisis_server.exe"
start "CCRAS Frontend" cmd /k "cd /d "%~dp0frontend%" && npm run dev"

echo.
echo Backend and frontend are starting in separate windows.
echo Close those windows to stop the services.

endlocal