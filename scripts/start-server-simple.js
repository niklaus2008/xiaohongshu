#!/usr/bin/env node

/**
 * 简单的服务器启动脚本
 * 用于 Chrome Extension 调用
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 获取项目根目录
const PROJECT_DIR = path.join(__dirname, '..');
const PID_FILE = path.join(PROJECT_DIR, '.web-server.pid');

// 检查是否已经在运行
if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim());
    if (!isNaN(pid)) {
        try {
            process.kill(pid, 0);
            // 进程存在，退出
            process.exit(0);
        } catch (error) {
            // 进程不存在，继续启动
        }
    }
}

// 设置环境变量，禁用自动打开浏览器
const env = {
    ...process.env,
    AUTO_OPEN_BROWSER: 'false'
};

// 启动服务器
const serverProcess = spawn('node', ['src/web-interface.js'], {
    cwd: PROJECT_DIR,
    env: env,
    stdio: 'ignore',
    detached: true
});

// 保存PID
fs.writeFileSync(PID_FILE, serverProcess.pid.toString());

// 让进程独立运行
serverProcess.unref();

// 立即退出，让服务器在后台运行
process.exit(0);

