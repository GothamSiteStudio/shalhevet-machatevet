@echo off
chcp 65001 >nul
echo.
echo ===================================
echo  שלהבת מחטבת - Next.js App Setup
echo ===================================
echo.

REM Get the directory of this batch file
set "APP_DIR=%~dp0"
set "ROOT_DIR=%~dp0.."

REM Create images folder
echo Creating images folder...
if not exist "%APP_DIR%public\images" mkdir "%APP_DIR%public\images"

REM Copy logo
echo Copying logo...
if exist "%ROOT_DIR%logo.png" (
    copy /Y "%ROOT_DIR%logo.png" "%APP_DIR%public\images\logo.png"
    echo Logo copied successfully!
) else (
    echo Logo not found at root, skipping...
)

REM Install dependencies
echo.
echo Installing npm packages (this may take a few minutes)...
cd /d "%APP_DIR%"
call npm install

echo.
echo ===================================
echo  Installation complete!
echo  Starting dev server on port 3000...
echo ===================================
echo.
call npm run dev
