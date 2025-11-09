@echo off
REM 后台启动Web界面服务器脚本 (Windows)
REM 使用方法: scripts\start-web-background.bat

REM 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%.."

REM 切换到项目目录
cd /d "%PROJECT_DIR%"

REM PID文件路径
set "PID_FILE=%PROJECT_DIR%\.web-server.pid"
set "LOG_FILE=%PROJECT_DIR%\logs\web-server.log"

REM 检查服务器是否已经在运行
if exist "%PID_FILE%" (
    for /f "tokens=*" %%i in (%PID_FILE%) do set OLD_PID=%%i
    tasklist /FI "PID eq !OLD_PID!" 2>NUL | find /I /N "node.exe">NUL
    if "!ERRORLEVEL!"=="0" (
        echo ⚠️  Web服务器已经在运行中 (PID: !OLD_PID!)
        echo 📱 访问地址: http://localhost:3000
        exit /b 0
    ) else (
        REM PID文件存在但进程不存在，删除旧的PID文件
        del "%PID_FILE%" 2>NUL
    )
)

REM 确保日志目录存在
if not exist "%PROJECT_DIR%\logs" mkdir "%PROJECT_DIR%\logs"

REM 启动服务器（后台运行）
echo 🚀 正在后台启动Web界面服务器...
start /B node src\web-interface.js > "%LOG_FILE%" 2>&1

REM 获取进程ID（Windows下比较复杂，使用tasklist查找）
timeout /t 2 /nobreak >NUL
for /f "tokens=2" %%i in ('tasklist /FI "IMAGENAME eq node.exe" /FO LIST ^| findstr /I "PID"') do (
    echo %%i > "%PID_FILE%"
    echo ✅ Web服务器已成功启动 (PID: %%i)
    goto :found
)

:found
echo 📱 访问地址: http://localhost:3000
echo 📝 日志文件: %LOG_FILE%
echo 🛑 停止服务器: npm run stop:web 或 scripts\stop-web-background.bat

