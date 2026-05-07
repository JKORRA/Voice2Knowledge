#!/bin/bash
set -e

echo "Building Voice2Knowledge..."

echo "1. Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "2. Installing requirements & PyInstaller..."
source venv/bin/activate
pip install -r requirements.txt
pip install pyinstaller

echo "3. Packaging application..."
pyinstaller app.spec --clean -y

echo "Build complete! Check the dist/Voice2Knowledge folder."
