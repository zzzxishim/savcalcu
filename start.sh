#!/bin/bash

# Start both frontend and backend servers
echo "Starting SavCalcu servers..."

# Start backend (port 5000)
echo "→ Starting backend on port 5000..."
cd server
npm start &
BACKEND_PID=$!

# Wait for backend to initialize
sleep 2

# Start frontend (port 3000)
echo "→ Starting frontend on port 3000..."
cd ..
npm run dev &
FRONTEND_PID=$!

echo ""
echo "🎉 SavCalcu is running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Handle cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Wait for any process to exit
wait
