@echo off
title Shalhevet App - Tunnel Mode
cd /d "c:\Users\orens\OneDrive\שולחן העבודה\alpha marketing projects\שלהבת מחטבת אפליקציה\shalhevet-app"

echo.
echo ====================================
echo  שלהבת מחטבת - מצב Tunnel
echo  (עובד מכל רשת, גם ללא WiFi משותף)
echo ====================================
echo.
echo מתקין ngrok אם חסר ומפעיל...
echo זה עלול לקחת דקה נוספת בפעם הראשונה.
echo.

call npx expo start --tunnel

echo.
echo *** האפליקציה נסגרה ***
echo.
pause
