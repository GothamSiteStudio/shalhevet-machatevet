@echo off
title Shalhevet App
cd /d "c:\Users\orens\OneDrive\שולחן העבודה\alpha marketing projects\שלהבת מחטבת אפליקציה\shalhevet-app"

echo.
echo ====================================
echo  מפעיל את אפליקציית שלהבת מחטבת
echo ====================================
echo.
echo חשוב: הטלפון והמחשב חייבים להיות על אותה רשת WiFi!
echo.
echo כתובת IP של המחשב:
ipconfig | findstr /i "IPv4"
echo.
echo מפעיל Expo עם LAN...
echo.

call npx expo start --lan

echo.
echo *** האפליקציה נסגרה ***
echo אם לא עובד עם LAN, נסה להפעיל: הפעל-tunnel.bat
echo.
pause
