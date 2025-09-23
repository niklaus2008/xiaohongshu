/**
 * 小红书餐馆图片下载工具 - Web界面服务器
 * 提供图形化界面用于批量配置和下载餐馆图片
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { exec } = require('child_process');
const { chromium } = require('playwright');
const { BatchProcessor } = require('./batch-processor');
const { getLogger } = require('./logger');

class WebInterface {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     * @param {number} options.port - 服务器端口
     * @param {string} options.host - 服务器主机
     * @param {boolean} options.autoOpenBrowser - 是否自动打开浏览器
     */
    constructor(options = {}) {
        this.port = options.port || 3000;
        this.host = options.host || 'localhost';
        this.autoOpenBrowser = options.autoOpenBrowser !== undefined ? options.autoOpenBrowser : true;
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        // 批量处理器实例
        this.batchProcessor = null;
        
        // 日志管理器实例
        this.logger = null;
        
        // 设置中间件
        this.setupMiddleware();
        
        // 设置路由
        this.setupRoutes();
        
        // 设置Socket.IO事件
        this.setupSocketEvents();
    }

    /**
     * 设置中间件
     * @private
     */
    setupMiddleware() {
        // 启用CORS
        this.app.use(cors());
        
        // 解析JSON请求体
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // 静态文件服务
        this.app.use(express.static(path.join(__dirname, '../public')));
        
        // 请求日志
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    /**
     * 设置路由
     * @private
     */
    setupRoutes() {
        // 主页路由
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/index.html'));
        });

        // API路由
        this.app.post('/api/start', this.handleStart.bind(this));
        this.app.post('/api/stop', this.handleStop.bind(this));
        this.app.post('/api/stop-heartbeat', this.handleStopHeartbeat.bind(this));
        this.app.get('/api/status', this.handleStatus.bind(this));
        this.app.get('/api/logs', this.handleLogs.bind(this));
        this.app.post('/api/config/save', this.handleSaveConfig.bind(this));
        this.app.get('/api/config/load', this.handleLoadConfig.bind(this));
        this.app.get('/api/login/status', this.handleLoginStatus.bind(this));
        this.app.post('/api/login/check', this.handleLoginCheck.bind(this));
        this.app.post('/api/login/validate', this.handleCookieValidation.bind(this));
        
        // 错误处理中间件
        this.app.use((err, req, res, next) => {
            console.error('服务器错误:', err);
            res.status(500).json({ 
                success: false, 
                error: err.message 
            });
        });
    }

    /**
     * 设置Socket.IO事件
     * @private
     */
    setupSocketEvents() {
        // 获取全局日志管理器实例
        this.logger = getLogger({
            io: this.io,
            enableTerminal: true,
            enableFrontend: true
        });
        
        this.io.on('connection', (socket) => {
            console.log(`客户端已连接: ${socket.id}`);
            this.logger.sendServiceLog(`客户端已连接: ${socket.id}`, 'info');
            
            // 发送当前状态
            this.sendCurrentStatus(socket);
            
            // 处理断开连接
            socket.on('disconnect', () => {
                console.log(`客户端已断开: ${socket.id}`);
                this.logger.sendServiceLog(`客户端已断开: ${socket.id}`, 'info');
            });
        });
        
        // 注意：task_completed 事件是从 batch-processor.js 发送的
        // 这里不需要监听，因为 batch-processor.js 会直接调用相关方法
        
        // 不自动启动心跳检测，只在有任务时启动
        // this.startHeartbeat();
    }

    /**
     * 处理开始下载请求
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async handleStart(req, res) {
        try {
            const { restaurants, outputPath, options } = req.body;
            
            // 验证输入
            if (!restaurants || !Array.isArray(restaurants) || restaurants.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: '请提供有效的餐馆列表'
                });
            }
            
            if (!outputPath || typeof outputPath !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: '请提供有效的输出路径'
                });
            }
            
            // 检查是否已有任务在运行，如果有则清空
            if (this.batchProcessor && this.batchProcessor.isRunning()) {
                console.log('🔄 检测到未完成的任务，正在清空...');
                this.logger.sendTaskLog('检测到未完成的任务，正在清空...', 'warning');
                try {
                    await this.batchProcessor.stop();
                    console.log('✅ 已清空之前的未完成任务');
                    this.logger.sendTaskLog('已清空之前的未完成任务', 'success');
                } catch (error) {
                    console.log('⚠️ 清空任务时出现警告:', error.message);
                    this.logger.sendWarningLog(`清空任务时出现警告: ${error.message}`);
                }
            }
            
            // 创建批量处理器
            console.log('🔧 正在创建批量处理器...');
            this.logger.sendTaskLog('正在创建批量处理器...', 'info');
            this.batchProcessor = new BatchProcessor({
                restaurants,
                outputPath,
                options: options || {},
                io: this.io,
                logger: this.logger, // 传递日志管理器
                webInterface: this // 传递Web界面实例
            });
            
            // 开始处理
            console.log('🚀 正在启动批量处理任务...');
            this.logger.sendTaskLog('正在启动批量处理任务...', 'info');
            
            // 启动心跳检测
            this.startHeartbeat();
            
            await this.batchProcessor.start();
            
            // 发送启动成功消息
            this.logger.sendServiceLog('任务已启动', 'success');
            
            res.json({
                success: true,
                message: '批量下载任务已开始'
            });
            
        } catch (error) {
            console.error('启动任务失败:', error);
            this.logger.sendErrorLog('启动任务失败', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 处理停止下载请求
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async handleStop(req, res) {
        try {
            if (!this.batchProcessor) {
                return res.json({
                    success: true,
                    message: '没有运行中的任务'
                });
            }
            
            await this.batchProcessor.stop();
            
            // 停止心跳检测
            this.stopHeartbeat();
            
            res.json({
                success: true,
                message: '任务已停止'
            });
            
        } catch (error) {
            console.error('停止任务失败:', error);
            this.logger.sendErrorLog('停止任务失败', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 处理停止心跳检测请求
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async handleStopHeartbeat(req, res) {
        try {
            console.log('🛑 手动停止心跳检测请求');
            this.logger.sendServiceLog('手动停止心跳检测请求', 'warning');
            
            // 停止心跳检测
            this.stopHeartbeat();
            
            // 发送停止通知到前端
            this.io.emit('heartbeat_stopped', {
                timestamp: new Date().toISOString(),
                message: '心跳检测已手动停止'
            });
            
            res.json({
                success: true,
                message: '心跳检测已停止'
            });
            
        } catch (error) {
            console.error('停止心跳检测失败:', error);
            this.logger.sendErrorLog('停止心跳检测失败', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 处理状态查询请求
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    handleStatus(req, res) {
        try {
            const status = this.getCurrentStatus();
            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            console.error('获取状态失败:', error);
            this.logger.sendErrorLog('获取状态失败', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 处理日志查询请求
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    handleLogs(req, res) {
        try {
            const logs = this.batchProcessor ? this.batchProcessor.getLogs() : [];
            res.json({
                success: true,
                data: logs
            });
        } catch (error) {
            console.error('获取日志失败:', error);
            this.logger.sendErrorLog('获取日志失败', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 处理保存配置请求
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async handleSaveConfig(req, res) {
        try {
            const { config } = req.body;
            const configPath = path.join(__dirname, '../config/web-config.json');
            
            await fs.ensureDir(path.dirname(configPath));
            await fs.writeJson(configPath, config, { spaces: 2 });
            
            res.json({
                success: true,
                message: '配置已保存'
            });
        } catch (error) {
            console.error('保存配置失败:', error);
            this.logger.sendErrorLog('保存配置失败', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 处理加载配置请求
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async handleLoadConfig(req, res) {
        try {
            const configPath = path.join(__dirname, '../config/web-config.json');
            
            if (await fs.pathExists(configPath)) {
                const config = await fs.readJson(configPath);
                res.json({
                    success: true,
                    data: config
                });
            } else {
                res.json({
                    success: true,
                    data: null
                });
            }
        } catch (error) {
            console.error('加载配置失败:', error);
            this.logger.sendErrorLog('加载配置失败', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 处理登录状态查询请求
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async handleLoginStatus(req, res) {
        try {
            const cookieFile = path.join(__dirname, '../cookies.json');
            let isLoggedIn = false;
            let cookieInfo = null;
            
            if (await fs.pathExists(cookieFile)) {
                const cookies = await fs.readJson(cookieFile);
                if (cookies && cookies.length > 0) {
                    // 检查Cookie是否过期
                    const now = Date.now() / 1000;
                    const validCookies = cookies.filter(cookie => {
                        if (cookie.expires && cookie.expires < now) {
                            return false;
                        }
                        return true;
                    });
                    
                    if (validCookies.length > 0) {
                        isLoggedIn = true;
                        cookieInfo = {
                            count: validCookies.length,
                            expires: Math.min(...validCookies.map(c => c.expires || Infinity))
                        };
                    }
                }
            }
            
            res.json({
                success: true,
                data: {
                    isLoggedIn,
                    cookieInfo
                }
            });
        } catch (error) {
            console.error('检查登录状态失败:', error);
            this.logger.sendErrorLog('检查登录状态失败', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 处理登录检查请求
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async handleLoginCheck(req, res) {
        try {
            const { cookies } = req.body;
            
            if (!cookies || !Array.isArray(cookies)) {
                return res.status(400).json({
                    success: false,
                    error: '无效的Cookie数据'
                });
            }
            
            // 保存Cookie到文件
            const cookieFile = path.join(__dirname, '../cookies.json');
            await fs.writeJson(cookieFile, cookies, { spaces: 2 });
            
            console.log(`✅ 已保存 ${cookies.length} 个Cookie到文件`);
            this.logger.sendSuccessLog(`已保存 ${cookies.length} 个Cookie到文件`);
            
            res.json({
                success: true,
                message: 'Cookie已保存',
                data: {
                    count: cookies.length
                }
            });
        } catch (error) {
            console.error('保存Cookie失败:', error);
            this.logger.sendErrorLog('保存Cookie失败', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 处理Cookie有效性检测请求
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async handleCookieValidation(req, res) {
        try {
            const { cookies } = req.body;
            
            if (!cookies || !Array.isArray(cookies)) {
                return res.json({
                    success: false,
                    error: '无效的Cookie数据'
                });
            }
            
            console.log(`🔍 开始处理 ${cookies.length} 个Cookie...`);
            this.logger.sendInfoLog(`开始处理 ${cookies.length} 个Cookie...`);
            
            // 使用简单的Cookie验证方法
            const { validateAndSaveCookies } = require('../simple-cookie-validator');
            const result = await validateAndSaveCookies(cookies);
            
            if (result.success) {
                console.log(`✅ Cookie保存成功: ${result.data.count} 个Cookie`);
                this.logger.sendSuccessLog(`Cookie保存成功: ${result.data.count} 个Cookie`);
                res.json({
                    success: true,
                    data: {
                        isValid: true,
                        message: 'Cookie已保存，登录状态已同步',
                        cookieCount: result.data.count
                    }
                });
            } else {
                console.log(`❌ Cookie保存失败: ${result.message}`);
                this.logger.sendErrorLog(`Cookie保存失败: ${result.message}`);
                res.json({
                    success: true,
                    data: {
                        isValid: false,
                        message: result.message,
                        cookieCount: 0
                    }
                });
            }
            
        } catch (error) {
            console.error('Cookie处理失败:', error);
            this.logger.sendErrorLog('Cookie处理失败', error);
            res.json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 获取当前状态
     * @returns {Object} 当前状态信息
     */
    getCurrentStatus() {
        const baseStatus = {
            isRunning: false,
            progress: 0,
            currentRestaurant: null,
            totalRestaurants: 0,
            completedRestaurants: 0,
            totalImages: 0,
            downloadedImages: 0,
            errors: [],
            heartbeat: {
                isActive: !!(this.heartbeatInterval || this.statusUpdateInterval),
                heartbeatInterval: !!this.heartbeatInterval,
                statusUpdateInterval: !!this.statusUpdateInterval
            }
        };
        
        if (!this.batchProcessor) {
            return baseStatus;
        }
        
        const batchStatus = this.batchProcessor.getStatus();
        return {
            ...batchStatus,
            heartbeat: {
                isActive: !!(this.heartbeatInterval || this.statusUpdateInterval),
                heartbeatInterval: !!this.heartbeatInterval,
                statusUpdateInterval: !!this.statusUpdateInterval
            }
        };
    }

    /**
     * 发送当前状态给客户端
     * @param {Object} socket - Socket.IO客户端
     */
    sendCurrentStatus(socket) {
        const status = this.getCurrentStatus();
        socket.emit('status', status);
    }
    
    /**
     * 启动心跳检测
     * @private
     */
    startHeartbeat() {
        // 每60秒发送一次心跳检测，减少频率
        this.heartbeatInterval = setInterval(() => {
            if (this.batchProcessor && this.batchProcessor.isRunning()) {
                const status = this.getCurrentStatus();
                this.io.emit('heartbeat', {
                    timestamp: new Date().toISOString(),
                    status: status,
                    message: '服务状态:心跳检测正常'
                });
                console.log('💓 心跳检测: 服务运行正常');
                this.logger.sendServiceLog('心跳检测正常', 'info');
            }
        }, 60000); // 60秒间隔
        
        // 每5分钟发送一次详细状态更新
        this.statusUpdateInterval = setInterval(() => {
            if (this.batchProcessor && this.batchProcessor.isRunning()) {
                const status = this.getCurrentStatus();
                this.io.emit('detailed_status', {
                    timestamp: new Date().toISOString(),
                    status: status,
                    message: '服务状态:详细状态更新'
                });
                console.log('📊 详细状态更新: 服务运行正常');
                this.logger.sendServiceLog('详细状态更新', 'info');
            }
        }, 300000); // 5分钟间隔
    }

    /**
     * 停止心跳检测
     * @private
     */
    stopHeartbeat() {
        let stoppedCount = 0;
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
            stoppedCount++;
            console.log('💓 心跳检测已停止');
            this.logger.sendServiceLog('心跳检测已停止', 'info');
        }
        
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
            this.statusUpdateInterval = null;
            stoppedCount++;
            console.log('📊 状态更新已停止');
            this.logger.sendServiceLog('状态更新已停止', 'info');
        }
        
        // 发送停止通知到所有客户端
        if (this.io) {
            this.io.emit('heartbeat_stopped', {
                timestamp: new Date().toISOString(),
                message: `心跳检测已停止 (清理了 ${stoppedCount} 个定时器)`,
                stoppedTimers: stoppedCount
            });
        }
        
        console.log(`🛑 心跳检测清理完成，共清理了 ${stoppedCount} 个定时器`);
    }

    /**
     * 自动打开浏览器（使用Chromium）
     * @private
     * @param {string} url - 要打开的URL
     */
    async openBrowser(url) {
        try {
            console.log(`🌐 正在使用Chromium浏览器打开: ${url}`);
            this.logger.sendServiceLog(`正在使用Chromium浏览器打开: ${url}`, 'info');
            
            // 使用Playwright启动Chromium浏览器
            const browser = await chromium.launch({
                headless: false, // 显示浏览器窗口
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });
            
            // 创建新页面并导航到指定URL
            const page = await browser.newPage();
            await page.goto(url, { 
                waitUntil: 'networkidle',
                timeout: 30000 
            });
            
            // 保存浏览器实例，以便后续使用
            this.browserInstance = browser;
            this.browserPage = page;
            
            console.log(`✅ Chromium浏览器已打开: ${url}`);
            this.logger.sendSuccessLog(`Chromium浏览器已打开: ${url}`);
            
        } catch (error) {
            console.log(`⚠️ 使用Chromium打开浏览器失败: ${error.message}`);
            this.logger.sendWarningLog(`使用Chromium打开浏览器失败: ${error.message}`);
            
            // 如果Chromium打开失败，回退到系统默认浏览器
            console.log(`🔄 回退到系统默认浏览器...`);
            this.logger.sendServiceLog('回退到系统默认浏览器', 'warning');
            this.openSystemBrowser(url);
        }
    }

    /**
     * 使用系统默认浏览器打开（回退方案）
     * @private
     * @param {string} url - 要打开的URL
     */
    async openSystemBrowser(url) {
        try {
            let command;
            const platform = process.platform;
            
            if (platform === 'darwin') {
                // macOS
                command = `open "${url}"`;
            } else if (platform === 'win32') {
                // Windows
                command = `start "${url}"`;
            } else {
                // Linux和其他Unix系统
                command = `xdg-open "${url}"`;
            }
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.log(`⚠️ 系统浏览器打开失败: ${error.message}`);
                    this.logger.sendWarningLog(`系统浏览器打开失败: ${error.message}`);
                } else {
                    console.log(`✅ 系统浏览器已打开: ${url}`);
                    this.logger.sendSuccessLog(`系统浏览器已打开: ${url}`);
                }
            });
            
        } catch (error) {
            console.log(`⚠️ 系统浏览器打开时出现错误: ${error.message}`);
            this.logger.sendWarningLog(`系统浏览器打开时出现错误: ${error.message}`);
        }
    }

    /**
     * 启动服务器
     */
    async start() {
        try {
            // 确保必要的目录存在
            await fs.ensureDir(path.join(__dirname, '../public'));
            await fs.ensureDir(path.join(__dirname, '../config'));
            
            this.server.listen(this.port, this.host, () => {
                console.log(`🚀 Web界面服务器已启动`);
                console.log(`📱 访问地址: http://${this.host}:${this.port}`);
                console.log(`⏹️  按 Ctrl+C 停止服务器`);
                this.logger.sendServiceLog('Web界面服务器已启动', 'success');
                this.logger.sendServiceLog(`访问地址: http://${this.host}:${this.port}`, 'info');
                
                // 自动打开浏览器
                if (this.autoOpenBrowser) {
                    const url = `http://${this.host}:${this.port}`;
                    // 延迟2秒后打开浏览器，确保服务器完全启动
                    setTimeout(() => {
                        this.openBrowser(url);
                    }, 2000);
                }
            });
            
            // 优雅关闭
            process.on('SIGINT', () => {
                console.log('\n🛑 正在关闭服务器...');
                this.logger.sendServiceLog('正在关闭服务器...', 'warning');
                this.stop();
            });
            
        } catch (error) {
            console.error('❌ 启动服务器失败:', error);
            this.logger.sendErrorLog('启动服务器失败', error);
            throw error;
        }
    }

    /**
     * 处理打开浏览器请求
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async handleOpenBrowser(req, res) {
        try {
            const { url } = req.body;
            
            if (!url || typeof url !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: '请提供有效的URL'
                });
            }
            
            console.log(`🌐 正在使用用户当前浏览器打开: ${url}`);
            this.logger.sendServiceLog(`正在使用用户当前浏览器打开: ${url}`, 'info');
            
            let browserSource = 'unknown';
            let isUserBrowser = false;
            
            // 检查是否有现有的浏览器实例
            if (!this.browserInstance) {
                console.log('🔧 尝试连接到用户当前浏览器...');
                this.logger.sendServiceLog('尝试连接到用户当前浏览器', 'info');
                
                // 尝试连接到用户当前浏览器
                this.browserInstance = await this.connectToUserBrowser();
                
                if (!this.browserInstance) {
                    console.log('🔧 无法连接到用户浏览器，创建新的浏览器实例...');
                    this.logger.sendServiceLog('无法连接到用户浏览器，创建新的浏览器实例', 'warning');
                    
                    // 创建新的浏览器实例
                    const { XiaohongshuScraper } = require('./xiaohongshu-scraper');
                    const scraper = new XiaohongshuScraper({
                        headless: false, // 显示浏览器窗口
                        login: {
                            method: 'manual',
                            autoLogin: true,
                            saveCookies: true,
                            cookieFile: './cookies.json'
                        }
                    });
                    
                    // 初始化浏览器
                    await scraper.initBrowser();
                    this.browserInstance = scraper.browser;
                    browserSource = 'new_instance';
                    
                    console.log('✅ 浏览器实例创建成功');
                    this.logger.sendServiceLog('浏览器实例创建成功', 'success');
                } else {
                    console.log('✅ 成功连接到用户当前浏览器');
                    this.logger.sendServiceLog('成功连接到用户当前浏览器', 'success');
                    browserSource = 'user_browser';
                    isUserBrowser = true;
                }
            } else {
                console.log('♻️ 复用现有浏览器实例');
                this.logger.sendServiceLog('复用现有浏览器实例', 'info');
                browserSource = 'existing_instance';
            }
            
            // 创建新页面并打开指定URL
            try {
                this.browserPage = await this.browserInstance.newPage();
                
                // 设置页面超时和用户代理
                await this.browserPage.setDefaultTimeout(30000);
                await this.browserPage.setExtraHTTPHeaders({
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                });
                
                await this.browserPage.goto(url, { 
                    waitUntil: 'networkidle',
                    timeout: 30000 
                });
                
                console.log(`✅ 已使用用户当前浏览器打开: ${url}`);
                this.logger.sendServiceLog(`已使用用户当前浏览器打开: ${url}`, 'success');
                
                // 如果是用户浏览器，提示用户完成登录
                if (isUserBrowser) {
                    this.logger.sendServiceLog('💡 请在打开的浏览器中完成小红书登录，然后点击"检查登录状态"', 'info');
                }
                
                res.json({
                    success: true,
                    message: '已使用用户当前浏览器打开页面',
                    data: {
                        url: url,
                        timestamp: new Date().toISOString(),
                        browserSource: browserSource,
                        isUserBrowser: isUserBrowser,
                        browserReused: !!this.browserInstance
                    }
                });
                
            } catch (pageError) {
                console.error('打开页面失败:', pageError);
                this.logger.sendErrorLog('打开页面失败', pageError);
                
                // 如果页面打开失败，尝试重新连接浏览器
                if (isUserBrowser) {
                    console.log('🔄 页面打开失败，尝试重新连接用户浏览器...');
                    this.logger.sendServiceLog('页面打开失败，尝试重新连接用户浏览器', 'warning');
                    
                    try {
                        this.browserInstance = await this.connectToUserBrowser();
                        if (this.browserInstance) {
                            this.browserPage = await this.browserInstance.newPage();
                            await this.browserPage.goto(url, { 
                                waitUntil: 'networkidle',
                                timeout: 30000 
                            });
                            
                            console.log(`✅ 重新连接成功，已打开: ${url}`);
                            this.logger.sendServiceLog(`重新连接成功，已打开: ${url}`, 'success');
                            
                            res.json({
                                success: true,
                                message: '重新连接成功，已打开页面',
                                data: {
                                    url: url,
                                    timestamp: new Date().toISOString(),
                                    browserSource: 'reconnected_user_browser',
                                    isUserBrowser: true,
                                    browserReused: false
                                }
                            });
                            return;
                        }
                    } catch (reconnectError) {
                        console.error('重新连接失败:', reconnectError);
                        this.logger.sendErrorLog('重新连接失败', reconnectError);
                    }
                }
                
                throw pageError;
            }
            
        } catch (error) {
            console.error('打开浏览器失败:', error);
            this.logger.sendErrorLog('打开浏览器失败', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 处理浏览器状态查询请求
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async handleBrowserStatus(req, res) {
        try {
            const isBrowserActive = !!this.browserInstance;
            const isPageActive = !!this.browserPage;
            
            res.json({
                success: true,
                data: {
                    browserActive: isBrowserActive,
                    pageActive: isPageActive,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('获取浏览器状态失败:', error);
            this.logger.sendErrorLog('获取浏览器状态失败', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 停止服务器
     */
    async stop() {
        try {
            // 停止批量处理器
            if (this.batchProcessor) {
                await this.batchProcessor.stop();
            }
            
            // 关闭浏览器实例
            if (this.browserInstance) {
                console.log('🔒 正在关闭浏览器实例...');
                this.logger.sendServiceLog('正在关闭浏览器实例', 'info');
                await this.browserInstance.close();
                this.browserInstance = null;
                this.browserPage = null;
                console.log('✅ 浏览器实例已关闭');
                this.logger.sendServiceLog('浏览器实例已关闭', 'success');
            }
            
            // 关闭服务器
            this.server.close(() => {
                console.log('✅ 服务器已关闭');
                this.logger.sendServiceLog('服务器已关闭', 'success');
                process.exit(0);
            });
            
        } catch (error) {
            console.error('❌ 关闭服务器失败:', error);
            this.logger.sendErrorLog('关闭服务器失败', error);
            process.exit(1);
        }
    }
}

// 如果直接运行此文件，启动服务器
if (require.main === module) {
    const webInterface = new WebInterface();
    webInterface.start().catch(error => {
        console.error('启动失败:', error);
        process.exit(1);
    });
}

module.exports = { WebInterface };
