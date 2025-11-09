#!/usr/bin/env node

/**
 * 后台启动Web界面服务器脚本 (跨平台)
 * 使用方法: node scripts/start-web-background.js 或 npm run start:web:background
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 获取项目根目录
const PROJECT_DIR = path.join(__dirname, '..');
const PID_FILE = path.join(PROJECT_DIR, '.web-server.pid');
const LOG_FILE = path.join(PROJECT_DIR, 'logs', 'web-server.log');

/**
 * 检查服务器是否已经在运行
 */
function checkRunning() {
    if (!fs.existsSync(PID_FILE)) {
        return false;
    }

    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim());
    
    if (isNaN(pid)) {
        return false;
    }

    try {
        // 发送信号0检查进程是否存在（不会杀死进程）
        process.kill(pid, 0);
        return true;
    } catch (error) {
        // 进程不存在
        return false;
    }
}

/**
 * 启动服务器
 */
function startServer() {
    // 检查是否已经在运行
    if (checkRunning()) {
        const pid = fs.readFileSync(PID_FILE, 'utf8').trim();
        console.log(`⚠️  Web服务器已经在运行中 (PID: ${pid})`);
        console.log('📱 访问地址: http://localhost:3000');
        return;
    }

    // 确保日志目录存在
    const logDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    // 设置环境变量，禁用自动打开浏览器
    const env = {
        ...process.env,
        AUTO_OPEN_BROWSER: 'false'
    };

    console.log('🚀 正在后台启动Web界面服务器...');

    // 启动服务器进程
    const serverProcess = spawn('node', ['src/web-interface.js'], {
        cwd: PROJECT_DIR,
        env: env,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
    });

    // 保存PID
    fs.writeFileSync(PID_FILE, serverProcess.pid.toString());

    // 重定向输出到日志文件
    const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
    serverProcess.stdout.pipe(logStream);
    serverProcess.stderr.pipe(logStream);

    // 等待服务器启动
    setTimeout(() => {
        // 检查进程是否还在运行
        try {
            process.kill(serverProcess.pid, 0);
            console.log(`✅ Web服务器已成功启动 (PID: ${serverProcess.pid})`);
            console.log('📱 访问地址: http://localhost:3000');
            console.log(`📝 日志文件: ${LOG_FILE}`);
            console.log('🛑 停止服务器: npm run stop:web');
        } catch (error) {
            console.log('❌ Web服务器启动失败');
            console.log(`📝 查看日志: tail -f ${LOG_FILE}`);
            if (fs.existsSync(PID_FILE)) {
                fs.unlinkSync(PID_FILE);
            }
            process.exit(1);
        }
    }, 2000);

    // 处理进程退出
    serverProcess.on('exit', (code) => {
        if (fs.existsSync(PID_FILE)) {
            fs.unlinkSync(PID_FILE);
        }
        if (code !== 0 && code !== null) {
            console.log(`⚠️  Web服务器异常退出 (退出码: ${code})`);
            console.log(`📝 查看日志: tail -f ${LOG_FILE}`);
        }
    });

    // 处理未捕获的错误
    serverProcess.on('error', (error) => {
        console.error('❌ 启动服务器时出错:', error.message);
        if (fs.existsSync(PID_FILE)) {
            fs.unlinkSync(PID_FILE);
        }
        process.exit(1);
    });
}

// 执行启动操作
startServer();

