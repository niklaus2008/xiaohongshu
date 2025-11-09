@echo off
REM 停止后台Web界面服务器脚本 (Windows)
REM 使用方法: scripts\stop-web-background.bat

REM 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%.."

REM PID文件路径
set "PID_FILE=%PROJECT_DIR%\.web-server.pid"

REM 检查PID文件是否存在
if not exist "%PID_FILE%" (
    echo ⚠️  Web服务器未运行（未找到PID文件）
    exit /b 0
)

REM 读取PID
for /f "tokens=*" %%i in (%PID_FILE%) do set SERVER_PID=%%i

REM 检查进程是否存在
tasklist /FI "PID eq %SERVER_PID%" 2>NUL | find /I /N "node.exe">NUL
if "!ERRORLEVEL!"=="0" (
    echo 🛑 正在停止Web服务器 (PID: %SERVER_PID%)...
    taskkill /PID %SERVER_PID% /F >NUL 2>&1
    echo ✅ Web服务器已停止
) else (
    echo ⚠️  Web服务器未运行（进程不存在）
)

REM 删除PID文件
del "%PID_FILE%" 2>NUL

