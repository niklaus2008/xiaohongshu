#!/bin/bash

# 停止后台Web界面服务器脚本 (macOS/Linux)
# 使用方法: ./scripts/stop-web-background.sh

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# PID文件路径
PID_FILE="$PROJECT_DIR/.web-server.pid"

# 检查PID文件是否存在
if [ ! -f "$PID_FILE" ]; then
    echo "⚠️  Web服务器未运行（未找到PID文件）"
    exit 0
fi

# 读取PID
SERVER_PID=$(cat "$PID_FILE")

# 检查进程是否存在
if ps -p "$SERVER_PID" > /dev/null 2>&1; then
    echo "🛑 正在停止Web服务器 (PID: $SERVER_PID)..."
    kill "$SERVER_PID"
    
    # 等待进程结束
    for i in {1..10}; do
        if ! ps -p "$SERVER_PID" > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    
    # 如果进程仍在运行，强制杀死
    if ps -p "$SERVER_PID" > /dev/null 2>&1; then
        echo "⚠️  进程未正常退出，强制终止..."
        kill -9 "$SERVER_PID"
    fi
    
    echo "✅ Web服务器已停止"
else
    echo "⚠️  Web服务器未运行（进程不存在）"
fi

# 删除PID文件
rm -f "$PID_FILE"

