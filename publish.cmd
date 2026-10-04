@echo off
rem Double-click to publish. Runs publish.ps1 without changing your PowerShell settings.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0publish.ps1" %*
pause
