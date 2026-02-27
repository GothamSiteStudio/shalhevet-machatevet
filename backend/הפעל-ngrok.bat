@echo off
title Backend - ngrok Tunnel
chcp 65001 >nul

echo.
echo ================================================
echo   שלהבת מחטבת - חשיפת השרת לאינטרנט (ngrok)
echo ================================================
echo.

REM בדוק אם ngrok מותקן
where ngrok >nul 2>&1
if errorlevel 1 (
    echo ⚠️  ngrok לא מותקן על המחשב.
    echo.
    echo 📥 כדי להתקין:
    echo    1. היכנס ל: https://ngrok.com/download
    echo    2. הורד את הגרסה ל-Windows
    echo    3. חלץ את ngrok.exe לתוך תיקייה ב-PATH (למשל C:\Windows)
    echo    4. הרשם בחינם ב: https://dashboard.ngrok.com
    echo    5. הפעל את הפקודה: ngrok config add-authtoken YOUR_TOKEN
    echo.
    echo לחלופין, אפשר להשתמש ב-npx ngrok (ללא התקנה):
    echo.
    echo מנסה עם npx...
    echo.
    
    REM נסה עם npx
    npx ngrok http 5000
    goto :end
)

echo 🚀 מפעיל ngrok על פורט 5000...
echo.
echo ⚠️  חשוב! אחרי שהכתובת תופיע:
echo    1. העתק את כתובת ה-https (לדוגמה: https://abc123.ngrok-free.app)
echo    2. פתח את הקובץ: shalhevet-app/src/config.js
echo    3. עדכן את השורה API_URL בסעיף tunnel עם הכתובת + /api
echo       לדוגמה: 'https://abc123.ngrok-free.app/api'
echo    4. שמור את הקובץ
echo.
echo ================================================
echo.

ngrok http 5000

:end
echo.
echo *** ngrok נסגר ***
pause
