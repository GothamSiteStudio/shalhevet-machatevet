@echo off
title Shalhevet App - Web Preview
cd /d "c:\Users\orens\OneDrive\שולחן העבודה\alpha marketing projects\שלהבת מחטבת אפליקציה\shalhevet-app"

echo.
echo ====================================
echo  שלהבת מחטבת - תצוגה בדפדפן
echo  (בחינה על המחשב ללא טלפון)
echo ====================================
echo.
echo מתקין חבילות Web...
call npm install react-dom react-native-web @expo/metro-runtime --legacy-peer-deps
echo.
echo פותח דפדפן...
echo Chrome / Edge יפתח אוטומטית ב: http://localhost:8081
echo.
call npx expo start --web

echo.
echo *** הדפדפן נסגר ***
pause
