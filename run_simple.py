#!/usr/bin/env python3
"""
Simple start script for Facebook Tracking System (Windows compatible)
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n[INFO] {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"[OK] {description} completed successfully")
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] {description} failed:")
        print(f"Error: {e.stderr}")
        return False

def check_requirements():
    """Check if required tools are installed"""
    print("Checking requirements...")
    
    # Check Python version
    if sys.version_info < (3, 11):
        print("ERROR: Python 3.11+ is required")
        return False
    
    # Check if virtual environment exists
    if not Path("venv").exists():
        print("WARNING: Virtual environment not found. Creating...")
        if not run_command("python -m venv venv", "Creating virtual environment"):
            return False
    
    print("OK: Requirements check passed")
    return True

def setup_environment():
    """Setup the environment"""
    print("\nSetting up environment...")
    
    # Create .env file if it doesn't exist
    if not Path(".env").exists():
        print("Creating .env file...")
        with open("env.example", "r", encoding='utf-8') as f:
            env_content = f.read()
        with open(".env", "w", encoding='utf-8') as f:
            f.write(env_content)
        print("OK: .env file created with SQLite configuration.")
    
    # Install dependencies
    if not run_command("venv\\Scripts\\pip install -r requirements.txt" if os.name == 'nt' else "venv/bin/pip install -r requirements.txt", "Installing dependencies"):
        print("\nERROR: Failed to install dependencies.")
        print("TIP: This might be due to missing system dependencies.")
        print("   For Windows, try installing Visual Studio Build Tools")
        print("   or use Docker instead: docker-compose up --build")
        return False
    
    return True

def setup_database():
    """Setup the database"""
    print("\nSetting up database...")
    
    # Set environment variables for Flask
    os.environ['FLASK_APP'] = 'app.py'
    os.environ['FLASK_ENV'] = 'development'
    
    # Initialize database
    migrations_path = Path("migrations")
    if not migrations_path.exists() or not any(migrations_path.iterdir()):
        if not run_command("venv\\Scripts\\flask db init" if os.name == 'nt' else "venv/bin/flask db init", "Initializing database"):
            print("WARNING: Database init reported an issue, continuing...")
    else:
        print("WARNING: Migrations directory exists, skipping init")
    
    # Try to resolve multiple heads (no-op if single head)
    run_command("venv\\Scripts\\flask db merge -m \"Merge heads\" heads" if os.name == 'nt' else "venv/bin/flask db merge -m \"Merge heads\" heads", "Merging Alembic heads")

    # Apply pending migrations first (if any)
    run_command("venv\\Scripts\\flask db upgrade" if os.name == 'nt' else "venv/bin/flask db upgrade", "Applying migration")

    # Try to create migration if there are model changes. If it fails, continue
    if not run_command("venv\\Scripts\\flask db migrate -m \"Auto migration\"" if os.name == 'nt' else "venv/bin/flask db migrate -m \"Auto migration\"", "Creating migration"):
        print("[WARN] Skipping migration creation (no changes or DB needed upgrade)")
    
    # Apply migrations again (in case a new one was created)
    if not run_command("venv\\Scripts\\flask db upgrade" if os.name == 'nt' else "venv/bin/flask db upgrade", "Applying migration"):
        return False
    
    return True

def load_sample_data():
    """Load sample data"""
    if os.environ.get('SEED_SAMPLE', '0') != '1':
        print("\nSkipping sample data seeding (set SEED_SAMPLE=1 to enable)")
        return True
    print("\nLoading sample data...")
    if not run_command("venv\\Scripts\\python seed_data.py" if os.name == 'nt' else "venv/bin/python seed_data.py", "Loading sample data"):
        return False
    return True

def start_application():
    """Start the application"""
    print("\nStarting application...")
    print("\n" + "="*60)
    print("Facebook Tracking System is ready!")
    print("="*60)
    print("\nLanding page: http://localhost:5000")
    print("Admin panel: http://localhost:5000/admin")
    print("\nLogin credentials:")
    print("   Email: admin@example.com")
    print("   Password: admin123")
    print("\nDocumentation: README.md")
    print("Examples: examples.md")
    print("\n" + "="*60)
    print("\nPress Ctrl+C to stop the application")
    print("="*60)
    
    # Start the application
    try:
        if os.name == 'nt':
            subprocess.run("venv\\Scripts\\python app.py", shell=True)
        else:
            subprocess.run("venv/bin/python app.py", shell=True)
    except KeyboardInterrupt:
        print("\n\nApplication stopped. Goodbye!")

def main():
    """Main function"""
    print("Facebook Tracking System - Quick Start")
    print("="*50)
    
    # Check if we're in the right directory
    if not Path("app.py").exists():
        print("ERROR: Please run this script from the project root directory")
        sys.exit(1)
    
    # Check requirements
    if not check_requirements():
        sys.exit(1)
    
    # Setup environment
    if not setup_environment():
        sys.exit(1)
    
    # Setup database
    if not setup_database():
        sys.exit(1)
    
    # Load sample data
    if not load_sample_data():
        sys.exit(1)
    
    # Start application
    start_application()

if __name__ == "__main__":
    main()
