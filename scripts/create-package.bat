@echo off
REM 创建扩展打包文件（Windows版本）
REM 用于将项目打包到新电脑上使用

setlocal enabledelayedexpansion

REM 获取当前日期时间
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%-%datetime:~8,6%
set PACKAGE_NAME=xiaohongshu-extension-%TIMESTAMP%.zip

echo 📦 开始打包扩展...
echo 排除目录: node_modules, logs, temp, browser-data, ai-analysis, .git
echo.

REM 检查必要文件是否存在
set MISSING=0
if not exist "extension" (echo ❌ 错误: extension 目录不存在 & set MISSING=1)
if not exist "src" (echo ❌ 错误: src 目录不存在 & set MISSING=1)
if not exist "public" (echo ❌ 错误: public 目录不存在 & set MISSING=1)
if not exist "scripts" (echo ❌ 错误: scripts 目录不存在 & set MISSING=1)
if not exist "package.json" (echo ❌ 错误: package.json 文件不存在 & set MISSING=1)

if %MISSING%==1 (
    echo.
    echo 请确保在项目根目录下运行此脚本
    exit /b 1
)

REM 创建打包文件
echo 正在创建打包文件: %PACKAGE_NAME%

REM 使用PowerShell压缩文件
powershell -Command "$files = @('extension', 'src', 'public', 'scripts', 'config', 'package.json', 'package-lock.json', 'README.md'); $exclude = @('node_modules', 'logs', 'temp', 'browser-data', 'ai-analysis', '.git'); $tempDir = [System.IO.Path]::GetTempPath() + [System.Guid]::NewGuid().ToString(); New-Item -ItemType Directory -Path $tempDir | Out-Null; foreach ($file in $files) { if (Test-Path $file) { Copy-Item -Path $file -Destination $tempDir -Recurse -Force } }; Get-ChildItem -Path $tempDir -Recurse | Where-Object { $exclude -contains $_.Name } | Remove-Item -Recurse -Force; Compress-Archive -Path $tempDir\* -DestinationPath '%PACKAGE_NAME%' -Force; Remove-Item -Path $tempDir -Recurse -Force"

if %ERRORLEVEL%==0 (
    echo.
    echo ✅ 打包完成!
    echo 📦 文件名: %PACKAGE_NAME%
    echo.
    echo 📝 下一步:
    echo 1. 将 %PACKAGE_NAME% 传输到新电脑
    echo 2. 解压文件
    echo 3. 在新电脑上运行: npm install
    echo 4. 启动Web服务器: npm run start:web:background
    echo 5. 在Chrome中加载 extension 目录
) else (
    echo ❌ 打包失败!
    exit /b 1
)

