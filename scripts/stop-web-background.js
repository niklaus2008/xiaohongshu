#!/usr/bin/env node

/**
 * 停止后台Web界面服务器脚本 (跨平台)
 * 使用方法: node scripts/stop-web-background.js 或 npm run stop:web
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// 获取项目根目录
const PROJECT_DIR = path.join(__dirname, '..');
const PID_FILE = path.join(PROJECT_DIR, '.web-server.pid');

/**
 * 停止服务器
 */
function stopServer() {
    // 检查PID文件是否存在
    if (!fs.existsSync(PID_FILE)) {
        console.log('⚠️  Web服务器未运行（未找到PID文件）');
        return;
    }

    // 读取PID
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim());

    if (isNaN(pid)) {
        console.log('⚠️  PID文件格式错误');
        fs.unlinkSync(PID_FILE);
        return;
    }

    // 检查进程是否存在
    try {
        // 使用 process.kill 检查进程是否存在（发送信号0不会杀死进程）
        process.kill(pid, 0);
        
        console.log(`🛑 正在停止Web服务器 (PID: ${pid})...`);
        
        // 尝试优雅关闭
        process.kill(pid, 'SIGTERM');
        
        // 等待进程结束（最多等待5秒）
        let waited = 0;
        const checkInterval = setInterval(() => {
            waited += 500;
            try {
                process.kill(pid, 0);
                if (waited >= 5000) {
                    // 5秒后强制杀死
                    console.log('⚠️  进程未正常退出，强制终止...');
                    process.kill(pid, 'SIGKILL');
                    clearInterval(checkInterval);
                    cleanup();
                }
            } catch (error) {
                // 进程已退出
                clearInterval(checkInterval);
                cleanup();
            }
        }, 500);
        
    } catch (error) {
        if (error.code === 'ESRCH') {
            // 进程不存在
            console.log('⚠️  Web服务器未运行（进程不存在）');
            cleanup();
        } else {
            console.error('❌ 停止服务器时出错:', error.message);
        }
    }
}

/**
 * 清理PID文件
 */
function cleanup() {
    if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE);
    }
    console.log('✅ Web服务器已停止');
}

// 执行停止操作
stopServer();

