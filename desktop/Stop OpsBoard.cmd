@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Stop-OpsBoard.ps1"
if errorlevel 1 pause
