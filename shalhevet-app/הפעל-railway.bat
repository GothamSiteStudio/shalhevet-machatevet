@echo off
title Shalhevet App - Railway Mode
cd /d "c:\Users\orens\OneDrive\שולחן העבודה\alpha marketing projects\שלהבת מחטבת אפליקציה\shalhevet-app"

echo.
echo ====================================
echo  שלהבת מחטבת - Railway Mode
echo ====================================
echo.

if not exist ".env" (
  echo חסר קובץ .env בתוך shalhevet-app
  echo.
  echo צרי קובץ .env על בסיס .env.example והגדירי:
  echo EXPO_PUBLIC_APP_ENV=production
  echo EXPO_PUBLIC_API_URL=https://YOUR-RAILWAY-DOMAIN/api
  echo.
  pause
  exit /b 1
)

echo מפעיל Expo במצב Tunnel עם הגדרות Railway...
echo הטלפונים יוכלו להתחבר דרך Expo Go.
echo.

call npx expo start --tunnel

echo.
echo *** האפליקציה נסגרה ***
echo.
pause