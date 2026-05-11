@echo off
setlocal

if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo Failed to create virtual environment
        exit /b 1
    )
)

call venv\Scripts\activate.bat
if errorlevel 1 (
    echo Failed to activate virtual environment
    exit /b 1
)

cd frontend
echo Installing frontend dependencies...
call npm install
if errorlevel 1 (
    echo Failed to install frontend dependencies
    exit /b 1
)

echo Building frontend...
call npm run build
if errorlevel 1 (
    echo Failed to build frontend
    exit /b 1
)
cd ..

echo Installing Python dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo Failed to install Python dependencies
    exit /b 1
)

echo Installing PyInstaller...
pip install pyinstaller
if errorlevel 1 (
    echo Failed to install PyInstaller
    exit /b 1
)

echo Packaging with PyInstaller...
pyinstaller app.spec --clean -y
if errorlevel 1 (
    echo Failed to package with PyInstaller
    exit /b 1
)

echo Build completed successfully!