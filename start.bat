@echo off
echo Starting SavCalcu servers...

cd server
start /B cmd /c "npm start"
cd ..

timeout /t 2 /nobreak >nul

start /B cmd /c "npm run dev"

echo.
echo SavCalcu is running!
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo.
pause
