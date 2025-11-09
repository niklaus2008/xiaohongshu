#!/bin/bash

# 后台启动Web界面服务器脚本 (macOS/Linux)
# 使用方法: ./scripts/start-web-background.sh

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# 切换到项目目录
cd "$PROJECT_DIR"

# PID文件路径
PID_FILE="$PROJECT_DIR/.web-server.pid"
LOG_FILE="$PROJECT_DIR/logs/web-server.log"

# 检查服务器是否已经在运行
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "⚠️  Web服务器已经在运行中 (PID: $OLD_PID)"
        echo "📱 访问地址: http://localhost:3000"
        exit 0
    else
        # PID文件存在但进程不存在，删除旧的PID文件
        rm -f "$PID_FILE"
    fi
fi

# 确保日志目录存在
mkdir -p "$(dirname "$LOG_FILE")"

# 启动服务器（后台运行，不自动打开浏览器）
echo "🚀 正在后台启动Web界面服务器..."
nohup node src/web-interface.js > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

# 保存PID
echo $SERVER_PID > "$PID_FILE"

# 等待服务器启动
sleep 2

# 检查服务器是否成功启动
if ps -p "$SERVER_PID" > /dev/null 2>&1; then
    echo "✅ Web服务器已成功启动 (PID: $SERVER_PID)"
    echo "📱 访问地址: http://localhost:3000"
    echo "📝 日志文件: $LOG_FILE"
    echo "🛑 停止服务器: npm run stop:web 或 ./scripts/stop-web-background.sh"
else
    echo "❌ Web服务器启动失败"
    echo "📝 查看日志: tail -f $LOG_FILE"
    rm -f "$PID_FILE"
    exit 1
fi

