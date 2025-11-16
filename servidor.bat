@echo off
title SERVIDOR SHOOTER MULTIPLAYER
color 0A

echo.
echo ================================================================================
echo                 SERVIDOR SHOOTER MULTIPLAYER - INICIANDO
echo ================================================================================
echo.

echo [INFO] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no encontrado. Instalalo desde https://nodejs.org/
    pause
    exit
)

echo [INFO] Iniciando servidor...
echo.
echo ================================================================================
echo                REVISIONES ANTI-CHEAT CONFIGURADAS
echo ================================================================================
echo.
echo INTERVALOS DE REVISION:
echo • DevTools/Consola:    cada 30 segundos
echo • Lag Switches:        cada 1 segundo
echo • Speed Hacks:         monitoreo continuo (60 FPS)
echo • Limpieza Salas:      cada 30 segundos  
echo • Estadisticas:        cada 60 segundos
echo • Regenerar Escudos:   cada 1 segundo
echo • Cajas Municion:      cada 10 segundos
echo.
echo ================================================================================
echo Servidor: http://localhost:3000
echo Admin: F2 (password: admin123)
echo.
echo Presiona CTRL+C para detener el servidor
echo ================================================================================
echo.

node servidor.js

if errorlevel 1 (
    echo.
    echo [ERROR] Servidor cerrado. Reiniciando en 5 segundos...
    timeout /t 5
    echo [INFO] Reiniciando...
    goto :INICIAR_SERVIDOR
)