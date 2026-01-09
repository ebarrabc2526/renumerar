@echo off
if "%1"=="" goto error
git add .
git commit -m "%1"
git push -u origin main
goto fin
:error
echo Uso: sube mensaje_commit
:fin
