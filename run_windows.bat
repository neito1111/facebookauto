@echo off
echo 🚀 Facebook Tracking System - Windows Quick Start
echo ==================================================

echo.
echo 🔍 Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found. Please install Python 3.11+ from https://python.org
    pause
    exit /b 1
)

echo ✅ Python found

echo.
echo 🛠️  Setting up environment...

if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ❌ Failed to create virtual environment
        pause
        exit /b 1
    )
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Upgrading pip...
python -m pip install --upgrade pip

echo Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo ❌ Failed to install dependencies
    echo 💡 Try running as Administrator or install Visual Studio Build Tools
    echo.
    echo Alternative: Use Docker instead
    echo docker-compose up --build
    pause
    exit /b 1
)

echo.
echo 📝 Creating .env file...
if not exist ".env" (
    copy env.example .env
    echo ✅ .env file created with SQLite configuration
)

echo.
echo 🗄️  Setting up database...
set FLASK_APP=app.py
set FLASK_ENV=development

echo Initializing database...
if not exist "migrations" (
    flask db init
    if errorlevel 1 (
        echo ❌ Failed to initialize migrations directory
        pause
        exit /b 1
    )
 ) else (
    echo ⚠️  Migrations directory already exists, skipping init
 )

echo Creating migration...
flask db migrate -m "Initial migration"
if errorlevel 1 (
    echo ⚠️  No new changes or migration already exists, continuing...
)

echo Applying migration...
flask db upgrade
if errorlevel 1 (
    echo ❌ Failed to apply migration
    pause
    exit /b 1
)

echo.
echo 📊 Loading sample data (set SEED_SAMPLE=1 to enable)...
if "%SEED_SAMPLE%"=="1" (
    python seed_data.py
    if errorlevel 1 (
        echo ❌ Failed to load sample data
        pause
        exit /b 1
    )
) else (
    echo ⏭️  Sample data seeding skipped
)

echo.
echo 🚀 Starting application...
echo.
echo ==================================================
echo 🎉 Facebook Tracking System is ready!
echo ==================================================
echo.
echo 📱 Landing page: http://localhost:5000
echo 🔧 Admin panel: http://localhost:5000/admin
echo.
echo 🔑 Login credentials:
echo    Email: admin@example.com
echo    Password: admin123
echo.
echo 📚 Documentation: README.md
echo 🧪 Examples: examples.md
echo.
echo ==================================================
echo Press Ctrl+C to stop the application
echo ==================================================
echo.

python app.py

pause
