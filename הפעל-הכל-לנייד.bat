@echo off
title שלהבת מחטבת - הפעלת הכל לבדיקה על נייד
chcp 65001 >nul

echo.
echo ╔══════════════════════════════════════════════════╗
echo ║      שלהבת מחטבת - מצב בדיקה על נייד          ║
echo ║      הפעלת שרת + ngrok + אפליקציה              ║
echo ╚══════════════════════════════════════════════════╝
echo.
echo 📋 מה הסקריפט הזה עושה:
echo    1. מפעיל את שרת ה-Backend
echo    2. מפעיל ngrok לחשיפת השרת לאינטרנט
echo    3. מפעיל את האפליקציה במצב Tunnel
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

set ROOT=c:\Users\orens\OneDrive\שולחן העבודה\alpha marketing projects\שלהבת מחטבת אפליקציה

echo [שלב 1/3] מפעיל שרת Backend...
start "Backend Server" cmd /k "cd /d "%ROOT%\backend" && node server.js"
timeout /t 3 /nobreak >nul

echo [שלב 2/3] מפעיל ngrok Tunnel לשרת...
start "ngrok - Backend Tunnel" cmd /k "cd /d "%ROOT%\backend" && הפעל-ngrok.bat"

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo ⏳ מחכה 10 שניות ל-ngrok לעלות...
echo    בינתיים: בדוק בחלון ה-ngrok את כתובת ה-HTTPS שנוצרה.
echo.
timeout /t 10 /nobreak >nul

echo.
echo ╔══════════════════════════════════════════════════╗
echo ║  ⚠️  עצור! עליך לעדכן את הכתובת לפני המשך!   ║
echo ╚══════════════════════════════════════════════════╝
echo.
echo 1. הסתכל בחלון "ngrok - Backend Tunnel"
echo 2. מצא את הכתובת שנראית כך: https://XXXXX.ngrok-free.app
echo 3. פתח את הקובץ: shalhevet-app\src\config.js
echo 4. עדכן את שורת ה-API_URL תחת tunnel להיות:
echo    'https://XXXXX.ngrok-free.app/api'
echo 5. שמור את הקובץ (Ctrl+S)
echo.
echo כשסיימת לעדכן, לחץ על כל מקש להמשך...
pause >nul

echo.
echo [שלב 3/3] מפעיל את האפליקציה במצב Tunnel...
echo    יופיע QR Code - סרוק אותו עם הנייד!
echo.

start "Expo App - Tunnel" cmd /k "cd /d "%ROOT%\shalhevet-app" && npx expo start --tunnel"

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo  ✅ הכל עולה! עקוב אחר ההוראות בחלון Expo
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
pause
