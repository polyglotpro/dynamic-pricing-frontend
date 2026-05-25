@echo off
setlocal

cd /d "%~dp0"

if not exist "node_modules\" (
  echo node_modules not found. Installing dependencies...
  call npm ci
  if errorlevel 1 (
    echo Failed to install dependencies.
    exit /b 1
  )
)

if not exist ".env" (
  if exist ".env.example" (
    echo NOTE: .env not found. Using defaults (VITE_API_URL defaults to http://localhost:8000).
    echo       Copy .env.example to .env to customize.
  )
)

echo Starting frontend (Vite dev server)...
call npm run dev -- --host

endlocal
