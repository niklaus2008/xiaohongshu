#!/usr/bin/env node

/**
 * 启动器服务 - 用于通过前端页面启动/停止 Web 界面服务器
 * 
 * 使用方法：
 * 1. 运行此脚本：node scripts/launcher-service.js
 * 2. 服务将监听在 http://localhost:3001
 * 3. 前端页面可以通过 POST /start 启动服务器
 * 4. 前端页面可以通过 POST /stop 停止服务器
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const PROJECT_DIR = path.join(__dirname, '..');
const PID_FILE = path.join(PROJECT_DIR, '.web-server.pid');
const LOG_FILE = path.join(PROJECT_DIR, 'logs', 'web-server.log');

/**
 * 检查服务器是否运行
 */
function isServerRunning() {
    if (!fs.existsSync(PID_FILE)) {
        return false;
    }

    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim());
    
    if (isNaN(pid)) {
        return false;
    }

    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * 启动服务器
 */
function startServer() {
    return new Promise((resolve, reject) => {
        // 检查是否已经在运行
        if (isServerRunning()) {
            const pid = fs.readFileSync(PID_FILE, 'utf8').trim();
            resolve({ success: true, message: '服务器已在运行', pid: pid });
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

        console.log('🚀 启动 Web 界面服务器...');

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
                console.log(`✅ Web服务器已启动 (PID: ${serverProcess.pid})`);
                resolve({ 
                    success: true, 
                    message: '服务器启动成功',
                    pid: serverProcess.pid
                });
            } catch (error) {
                console.log('❌ Web服务器启动失败');
                if (fs.existsSync(PID_FILE)) {
                    fs.unlinkSync(PID_FILE);
                }
                reject({ success: false, message: '服务器启动失败' });
            }
        }, 2000);

        // 处理进程退出
        serverProcess.on('exit', (code, signal) => {
            console.log(`服务器进程退出 (code: ${code}, signal: ${signal})`);
            if (fs.existsSync(PID_FILE)) {
                fs.unlinkSync(PID_FILE);
            }
        });
    });
}

/**
 * 停止服务器
 */
function stopServer() {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(PID_FILE)) {
            resolve({ success: true, message: '服务器未运行' });
            return;
        }

        const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim());
        
        if (isNaN(pid)) {
            resolve({ success: true, message: '无效的PID' });
            return;
        }

        try {
            process.kill(pid);
            fs.unlinkSync(PID_FILE);
            console.log(`✅ 服务器已停止 (PID: ${pid})`);
            resolve({ success: true, message: '服务器已停止', pid: pid });
        } catch (error) {
            console.error('停止服务器失败:', error);
            reject({ success: false, message: '停止服务器失败', error: error.message });
        }
    });
}

/**
 * 获取服务器状态
 */
function getStatus() {
    const running = isServerRunning();
    let pid = null;
    
    if (running && fs.existsSync(PID_FILE)) {
        pid = fs.readFileSync(PID_FILE, 'utf8').trim();
    }

    return {
        success: true,
        running: running,
        pid: pid,
        webServerUrl: 'http://localhost:3000'
    };
}

/**
 * 创建 HTTP 服务器
 */
const server = http.createServer(async (req, res) => {
    // 设置 CORS 头，允许前端页面访问
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // 路由处理
    if (req.url === '/status' && req.method === 'GET') {
        // 获取状态
        const status = getStatus();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status));
    } else if (req.url === '/start' && req.method === 'POST') {
        // 启动服务器
        try {
            const result = await startServer();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(error));
        }
    } else if (req.url === '/stop' && req.method === 'POST') {
        // 停止服务器
        try {
            const result = await stopServer();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(error));
        }
    } else {
        // 404
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Not Found' }));
    }
});

// 启动服务器
server.listen(PORT, 'localhost', () => {
    console.log('🚀 启动器服务已启动');
    console.log(`📍 监听地址: http://localhost:${PORT}`);
    console.log('');
    console.log('可用的 API:');
    console.log(`  GET  /status - 获取服务器状态`);
    console.log(`  POST /start  - 启动 Web 界面服务器`);
    console.log(`  POST /stop   - 停止 Web 界面服务器`);
    console.log('');
    console.log('按 Ctrl+C 停止启动器服务');
});

// 处理退出
process.on('SIGINT', () => {
    console.log('\n👋 启动器服务已停止');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 启动器服务已停止');
    process.exit(0);
});

