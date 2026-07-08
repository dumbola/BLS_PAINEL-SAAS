@echo off
cd "C:\Users\Dumbola\Desktop\BL's\BLS_PAINEL-SAAS\local-worker"
:loop
"C:\Program Files\nodejs\node.exe" server.js
echo A API Local fechou! Reiniciando automaticamente em 5 segundos...
timeout /t 5 >nul
goto loop
