@echo off
REM Setup script for Python server on Windows

echo 🚀 Setting up Campus AI Assistant Python Server...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8 or higher.
    exit /b 1
)

echo ✅ Python found
python --version

REM Create virtual environment
echo 📦 Creating virtual environment...
python -m venv venv

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo ⬆️ Upgrading pip...
python -m pip install --upgrade pip

REM Install dependencies
echo 📥 Installing dependencies...
pip install -r requirements.txt

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from template...
    copy .env.example .env
    echo ⚠️ Please edit .env file with your credentials
)

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Edit .env file with your API keys
echo 2. Activate virtual environment: venv\Scripts\activate
echo 3. Run server: python main.py
echo.

pause
