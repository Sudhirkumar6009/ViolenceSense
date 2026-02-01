#!/bin/bash

echo "===================================="
echo " ViolenceSense - Project Setup"
echo "===================================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python is not installed. Please install Python 3.9+"
    exit 1
fi

echo "Installing Backend Dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install backend dependencies"
    exit 1
fi
cd ..

echo ""
echo "Installing Frontend Dependencies..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install frontend dependencies"
    exit 1
fi
cd ..

echo ""
echo "Installing ML Service Dependencies..."
cd ml-service
python3 -m pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "WARNING: Some ML dependencies may have failed. GPU support may be limited."
fi
cd ..

echo ""
echo "Setting up environment files..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "Created backend/.env"
fi
if [ ! -f frontend/.env.local ]; then
    cp frontend/.env.local.example frontend/.env.local
    echo "Created frontend/.env.local"
fi
if [ ! -f ml-service/.env ]; then
    cp ml-service/.env.example ml-service/.env
    echo "Created ml-service/.env"
fi

echo ""
echo "Creating necessary directories..."
mkdir -p backend/uploads
mkdir -p backend/logs
mkdir -p ml-service/models

echo ""
echo "===================================="
echo " Setup Complete!"
echo "===================================="
echo ""
echo "To start the application:"
echo ""
echo "1. Start MongoDB:"
echo "   mongod"
echo ""
echo "2. Start ML Service (Terminal 1):"
echo "   cd ml-service && python3 main.py"
echo ""
echo "3. Start Backend (Terminal 2):"
echo "   cd backend && npm run dev"
echo ""
echo "4. Start Frontend (Terminal 3):"
echo "   cd frontend && npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser."
echo ""
