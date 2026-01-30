@echo off
echo ========================================
echo Campus AI Assistant - Starting Servers
echo ========================================
echo.

REM Check if Python server is set up
if not exist python-server\venv (
    echo ❌ Python virtual environment not found!
    echo Please run: cd python-server ^&^& setup.bat
    pause
    exit /b 1
)

REM Check if .env exists in python-server
if not exist python-server\.env (
    echo ❌ Python server .env file not found!
    echo Please copy python-server\.env.example to python-server\.env and configure it.
    pause
    exit /b 1
)

echo Starting servers in separate windows...
echo.

REM Start Python server in new window
start "Python FastAPI Server" cmd /k "cd python-server && venv\Scripts\activate && python main.py"
echo ✅ Python server starting on http://localhost:8001

REM Wait a bit for Python server to start
timeout /t 3 /nobreak > nul

REM Start Node.js server in new window
start "Node.js Express Server" cmd /k "node index.js"
echo ✅ Node.js server starting on http://localhost:5000

echo.
echo ========================================
echo Both servers are starting!
echo ========================================
echo.
echo Node.js Server: http://localhost:5000
echo Python Server:  http://localhost:8001
echo.
echo To stop servers, close their respective windows.
echo.
pause
