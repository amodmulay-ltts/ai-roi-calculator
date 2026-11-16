@echo off
rem Starts the VALUEAI AI Business Case app (apps\exec) on http://localhost:5174
setlocal
pushd "%~dp0\.."
if errorlevel 1 (
  echo Could not enter the project directory.
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or newer is required. Install Node.js, then run this script again.
  popd
  exit /b 1
)

set "NODE_MAJOR="
for /f "tokens=1 delims=." %%A in ('node -p "process.versions.node.split('.')[0]"') do set "NODE_MAJOR=%%A"
if not defined NODE_MAJOR (
  echo Could not determine the Node.js version.
  popd
  exit /b 1
)
if %NODE_MAJOR% LSS 20 (
  echo Node.js 20 or newer is required.
  popd
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm 10 or newer is required. Install npm, then run this script again.
  popd
  exit /b 1
)

set "NPM_MAJOR="
for /f "tokens=1 delims=." %%A in ('npm --version') do set "NPM_MAJOR=%%A"
if not defined NPM_MAJOR (
  echo Could not determine the npm version.
  popd
  exit /b 1
)
if %NPM_MAJOR% LSS 10 (
  echo npm 10 or newer is required.
  popd
  exit /b 1
)

set "NEED_INSTALL="
if not exist "node_modules\vite\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\react\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\recharts\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\zustand\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\tailwindcss\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\@ai-roi-calc\bizcase\package.json" set "NEED_INSTALL=1"
if defined NEED_INSTALL (
  echo Installing project dependencies...
  call npm install
  if errorlevel 1 (
    popd
    exit /b 1
  )
)

echo Starting the AI Business Case app on http://localhost:5174 (Ctrl+C to stop)
call npm run dev:exec
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
