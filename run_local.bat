@echo off
chcp 65001 >nul
echo ========================================================
echo   نظام المتابعة الشامل - خدمة وسائل الإيضاح
echo   أسرة الأنبا أرسانيوس والقديس نيقولاوس
echo ========================================================
echo.
echo [1] تشغيل الخادم المحلي الكامل عبر Node.js (مع حفظ البيانات والـ APIs)
echo [2] فتح صفحة الويب مباشرة في المتصفح الافتراضي (Chrome / Edge)
echo.
set /p choice="اختر طريقة التشغيل (1 أو 2) [الافتراضي: 1]: "

if "%choice%"=="2" (
    echo جاري فتح الموقع في المتصفح...
    start index.html
    exit /b
)

echo.
echo جاري فحص بيئة Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo تحذير: Node.js غير مثبت، سيتم فتح الموقع مباشرة في المتصفح.
    start index.html
    exit /b
)

echo جاري تشغيل الخادم على http://localhost:3000 ...
start http://localhost:3000
node server.js
pause
