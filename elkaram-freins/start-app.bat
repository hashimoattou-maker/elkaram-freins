@echo off
title EL Karam Freins SARL
echo ============================================
echo    EL Karam Freins SARL - Gestion Stock
echo ============================================
echo.

echo [1/1] Demarrage du serveur unique...
start "ELKARAM" cmd /c "cd /d "%~dp0backend" && npx tsx src\index.ts"
timeout /t 5 /nobreak >nul

echo.
echo ============================================
echo    Application lancee!
echo ============================================
echo.
echo Acces : http://localhost:5000
echo Login  : admin / admin123
echo.
echo (Un seul serveur, un seul lien)
echo.
pause
