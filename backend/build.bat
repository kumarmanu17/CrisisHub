@echo off
echo =========================================================
echo Compiling Corporate Crisis Resource Allocation System...
echo =========================================================

g++ -O3 -std=gnu++17 -Iinclude -D_WIN32_WINNT=0x0A00 src/main.cpp src/managers/AuthenticationManager.cpp src/managers/CrisisManager.cpp src/managers/ProjectManager.cpp src/managers/ResourceManager.cpp src/managers/AllocationManager.cpp src/managers/ReportManager.cpp src/server/HttpServer.cpp -o crisis_server.exe -lws2_32

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Compilation failed! Please verify g++ is in your PATH.
    exit /b %ERRORLEVEL%
) else (
    echo [SUCCESS] Compiled successfully as 'backend/crisis_server.exe'.
)
