@echo off
title Shalhevet App - SDK Upgrade
cd /d "c:\Users\orens\OneDrive\שולחן העבודה\alpha marketing projects\שלהבת מחטבת אפליקציה\shalhevet-app"

echo.
echo ====================================
echo  שדרוג Expo SDK לגרסה העדכנית
echo ====================================
echo.
echo שלב 1: שדרוג חבילות...
call npx expo upgrade --non-interactive
echo.
echo שלב 2: תיקון גרסאות תואמות...
call npx expo install --fix
echo.
echo שלב 3: npm install...
call npm install --legacy-peer-deps
echo.
echo ====================================
echo  השדרוג הסתיים! עכשיו הפעל:
echo  הפעל-אפליקציה.bat
echo ====================================
echo.
pause
