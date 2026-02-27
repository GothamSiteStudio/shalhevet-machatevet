@echo off
chcp 65001 > nul
title שרת שלהבת מחטבת
echo.
echo  ==========================================
echo   שרת שלהבת מחטבת - מופעל
echo  ==========================================
echo.

REM ==============================================================
REM פתרון בעיית OneDrive - מעתיקים לתיקייה מקומית
REM ==============================================================
set SOURCE_DIR=%~dp0
set WORK_DIR=C:\shalhevet-server

echo  מכין תיקיית עבודה מקומית...

REM צור תיקייה אם לא קיימת
if not exist "%WORK_DIR%" mkdir "%WORK_DIR%"

REM העתק קבצי שרת (לא node_modules)
echo  מעתיק קבצי שרת...
xcopy "%SOURCE_DIR%server.js" "%WORK_DIR%\" /Y /Q > nul
xcopy "%SOURCE_DIR%package.json" "%WORK_DIR%\" /Y /Q > nul
xcopy "%SOURCE_DIR%.env" "%WORK_DIR%\" /Y /Q > nul
xcopy "%SOURCE_DIR%db.json" "%WORK_DIR%\" /Y /Q 2>nul
if not exist "%WORK_DIR%\db.json" echo {"users":[],"weightHistory":[],"workoutLogs":[],"nutritionLogs":[],"updates":[],"meetings":[],"messages":[]} > "%WORK_DIR%\db.json"

REM העתק תיקיות
if not exist "%WORK_DIR%\routes" mkdir "%WORK_DIR%\routes"
if not exist "%WORK_DIR%\middleware" mkdir "%WORK_DIR%\middleware"
if not exist "%WORK_DIR%\utils" mkdir "%WORK_DIR%\utils"

xcopy "%SOURCE_DIR%routes\*" "%WORK_DIR%\routes\" /Y /Q > nul
xcopy "%SOURCE_DIR%middleware\*" "%WORK_DIR%\middleware\" /Y /Q > nul
xcopy "%SOURCE_DIR%utils\*" "%WORK_DIR%\utils\" /Y /Q > nul

cd /d "%WORK_DIR%"

REM בדוק אם node_modules קיים
if not exist "%WORK_DIR%\node_modules" (
    echo  מתקין חבילות - ייקח כ-2 דקות...
    npm install --loglevel=error
    echo.
    echo  ==========================================
    echo   החבילות הותקנו בהצלחה!
    echo  ==========================================
)

echo.
echo  מפעיל שרת...
echo  כתובת: http://localhost:5000
echo  לעצירה: לחץ Ctrl+C
echo.
echo  חשבון מאמנת: shalhevet@gmail.com
echo  סיסמה: Shalhevet2024!
echo.
node server.js

REM סנכרן חזרה את db.json לאחר שינויים
echo.
echo  מסנכרן נתונים...
xcopy "%WORK_DIR%\db.json" "%SOURCE_DIR%" /Y /Q > nul
echo  נתונים נשמרו!
pause
