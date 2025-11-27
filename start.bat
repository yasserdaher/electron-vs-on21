@echo off
:loop
echo تشغيل المشروع...
REM شغل مشروعك هنا، مثال node server
node server/index.js
echo المشروع توقف. إعادة التشغيل خلال 5 ثواني...
timeout /t 5
goto loop
