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
const CookieValidator = require('./cookie-validator');
const globalBrowserManager = require('./global-browser-manager');

class WebInterface {
    
    /**
     * 统一的登录状态检测方法
     * 结合Cookie评分和实际有效性验证
     * @returns {Promise<Object>} 登录状态信息
     */
    async getUnifiedLoginStatus() {
        try {
            const cookieFile = path.join(__dirname, '../cookies.json');
            let isLoggedIn = false;
            let cookieInfo = null;
            let loginScore = 0;
            
            if (await fs.pathExists(cookieFile)) {
                const cookies = await fs.readJson(cookieFile);
                if (cookies && cookies.length > 0) {
                    // 检查Cookie是否过期
                    const now = Date.now() / 1000;
                    const validCookies = cookies.filter(cookie => 
                        !cookie.expires || cookie.expires > now
                    );
                    
                    if (validCookies.length > 0) {
                        cookieInfo = {
                            count: validCookies.length,
                            expires: Math.min(...validCookies.map(c => c.expires || Infinity))
                        };
                        
                        // 基础评分：Cookie数量
                        loginScore = validCookies.length;
                        
                        // 加分：重要Cookie类型
                        const loginCookies = validCookies.filter(cookie => 
                            cookie.name.includes('session') || 
                            cookie.name.includes('token') || 
                            cookie.name.includes('user') ||
                            cookie.name.includes('auth')
                        );
                        loginScore += loginCookies.length * 2;
                        
                        // 加分：小红书特有的Cookie
                        const xiaohongshuCookies = validCookies.filter(cookie => 
                            cookie.name.includes('xiaohongshu') ||
                            cookie.name.includes('xhs') ||
                            cookie.name.includes('web_session') ||
                            cookie.name.includes('web_sessionid')
                        );
                        loginScore += xiaohongshuCookies.length * 3;
                        
                        // 限制最高评分为10
                        loginScore = Math.min(10, loginScore);
                        
                        // 只有评分 >= 3 才认为已登录
                        isLoggedIn = loginScore >= 3;
                        
                        console.log('🔍 统一登录评分计算:', {
                            validCookies: validCookies.length,
                            loginCookies: loginCookies.length,
                            xiaohongshuCookies: xiaohongshuCookies.length,
                            finalScore: loginScore,
                            isLoggedIn: isLoggedIn
                        });
                    }
                }
            }
            
            return {
                isLoggedIn,
                cookieInfo,
                loginScore
            };
        } catch (error) {
            console.error('统一登录状态检测失败:', error);
            return {
                isLoggedIn: false,
                cookieInfo: null,
                loginScore: 0,
                error: error.message
            };
        }
    }

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
        
        // Cookie验证器实例
        this.cookieValidator = new CookieValidator();
        
        // 浏览器实例管理 - 使用全局浏览器管理器
        this.browserInstance = null;
        this.browserPage = null;
        this.isBrowserInitialized = false;
        this.isLoginWindowOpen = false;
        
        // 全局浏览器管理器
        this.globalBrowserManager = globalBrowserManager;
        
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
        this.app.get('/api/login/validate-file', this.handleValidateCookieFile.bind(this));
        this.app.post('/api/login/reset', this.handleResetLoginWindow.bind(this));
        this.app.post('/api/open-browser', this.handleOpenBrowser.bind(this));
        this.app.post('/api/login/check-cross-window', this.handleCheckCrossWindowLogin.bind(this));
        
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
            const result = await this.getUnifiedLoginStatus();
            
            console.log('📊 最终登录状态:', { 
                isLoggedIn: result.isLoggedIn, 
                loginScore: result.loginScore, 
                cookieCount: result.cookieInfo?.count 
            });
            
            res.json({
                success: true,
                data: {
                    isLoggedIn: result.isLoggedIn,
                    cookieInfo: result.cookieInfo,
                    loginScore: result.loginScore
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
            
            console.log(`🔍 开始轻量级验证 ${cookies.length} 个Cookie...`);
            this.logger.sendInfoLog(`开始轻量级验证 ${cookies.length} 个Cookie...`);
            
            // 使用轻量级Cookie验证器
            const validationResult = await this.cookieValidator.validateCookies(cookies);
            
            console.log('📊 Cookie验证结果:', {
                isValid: validationResult.isValid,
                score: validationResult.score,
                confidence: validationResult.confidence
            });
            
            if (validationResult.isValid) {
                // 保存有效的Cookie
                const cookieFile = path.join(__dirname, '../cookies.json');
                await fs.writeJson(cookieFile, cookies, { spaces: 2 });
                
                console.log(`✅ Cookie验证成功并已保存: ${cookies.length} 个Cookie`);
                this.logger.sendSuccessLog(`Cookie验证成功并已保存: ${cookies.length} 个Cookie`);
                
                res.json({
                    success: true,
                    data: {
                        isValid: true,
                        score: validationResult.score,
                        confidence: validationResult.confidence,
                        message: 'Cookie验证成功并已保存',
                        cookieCount: cookies.length,
                        details: validationResult.details
                    }
                });
            } else {
                console.log(`❌ Cookie验证失败: ${validationResult.error || 'Cookie无效'}`);
                this.logger.sendErrorLog(`Cookie验证失败: ${validationResult.error || 'Cookie无效'}`);
                res.json({
                    success: true,
                    data: {
                        isValid: false,
                        score: validationResult.score,
                        confidence: validationResult.confidence,
                        message: validationResult.error || 'Cookie验证失败',
                        cookieCount: cookies.length,
                        details: validationResult.details
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
     * 处理验证Cookie文件请求
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async handleValidateCookieFile(req, res) {
        try {
            console.log('🔍 开始验证Cookie文件...');
            this.logger.sendInfoLog('开始验证Cookie文件...');
            
            // 验证现有的Cookie文件
            const cookieFile = path.join(__dirname, '../cookies.json');
            const validationResult = await this.cookieValidator.validateCookieFile(cookieFile);
            
            console.log('📊 Cookie文件验证结果:', {
                isValid: validationResult.isValid,
                score: validationResult.score,
                confidence: validationResult.confidence
            });
            
            res.json({
                success: true,
                data: {
                    isValid: validationResult.isValid,
                    score: validationResult.score,
                    confidence: validationResult.confidence,
                    message: validationResult.isValid ? 'Cookie文件验证成功' : 'Cookie文件验证失败',
                    cookieCount: validationResult.cookies,
                    details: validationResult.details,
                    error: validationResult.error
                }
            });
            
        } catch (error) {
            console.error('验证Cookie文件失败:', error);
            this.logger.sendErrorLog('验证Cookie文件失败', error);
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
        // 防止重复启动心跳检测
        if (this.heartbeatInterval || this.statusUpdateInterval) {
            console.log('⚠️ 心跳检测已在运行，跳过重复启动');
            return;
        }
        
        // 每60秒发送一次心跳检测，减少频率
        this.heartbeatInterval = setInterval(() => {
            if (this.batchProcessor && this.batchProcessor.isRunning()) {
                const status = this.getCurrentStatus();
                // 只在状态变化时发送日志
                if (!this._lastHeartbeatStatus || JSON.stringify(status) !== JSON.stringify(this._lastHeartbeatStatus)) {
                    this.io.emit('heartbeat', {
                        timestamp: new Date().toISOString(),
                        status: status,
                        message: '服务状态:心跳检测正常'
                    });
                    console.log('💓 心跳检测: 服务运行正常');
                    this.logger.sendServiceLog('心跳检测正常', 'info');
                    this._lastHeartbeatStatus = status;
                }
            }
        }, 60000); // 60秒间隔
        
        // 每5分钟发送一次详细状态更新
        this.statusUpdateInterval = setInterval(() => {
            if (this.batchProcessor && this.batchProcessor.isRunning()) {
                const status = this.getCurrentStatus();
                this.io.emit('status_update', {
                    timestamp: new Date().toISOString(),
                    status: status,
                    message: '详细状态更新'
                });
                console.log('📊 详细状态更新');
                this.logger.sendServiceLog('详细状态更新', 'info');
            }
        }, 300000); // 5分钟间隔
        
        console.log('💓 心跳检测已启动');
        this.logger.sendServiceLog('心跳检测已启动', 'info');
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
            // 设置用户数据目录，确保Cookie和缓存持久化
            const path = require('path');
            const userDataDir = path.join(process.cwd(), 'browser-data');
            
            try {
                // 使用launchPersistentContext来支持用户数据目录
                const context = await chromium.launchPersistentContext(userDataDir, {
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
                
                // 从持久化上下文中获取浏览器实例
                const browser = context.browser();
                
                // 使用持久化上下文创建新页面并导航到指定URL
                const page = await context.newPage();
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
                if (error.message.includes('ProcessSingleton') || error.message.includes('profile is already in use')) {
                    console.log('⚠️ 用户数据目录被占用，回退到普通模式...');
                    this.logger.sendWarningLog('用户数据目录被占用，回退到普通模式');
                    
                    // 回退到普通启动模式
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
                } else {
                    throw error;
                }
            }
            
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
     * 处理跨窗口登录检测请求
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async handleCheckCrossWindowLogin(req, res) {
        try {
            console.log('🔍 手动触发跨窗口登录检测...');
            
            if (!this.browserInstance || !this.isBrowserInitialized) {
                return res.status(400).json({
                    success: false,
                    error: '浏览器未初始化'
                });
            }
            
            // 创建临时爬虫实例进行检测
            const { XiaohongshuScraper } = require('./xiaohongshu-scraper');
            const tempScraper = new XiaohongshuScraper({
                headless: false,
                browserType: 'user-browser'
            });
            
            // 使用现有浏览器实例
            tempScraper.browser = this.browserInstance;
            tempScraper.page = await this.browserInstance.newPage();
            
            // 检测跨窗口登录状态
            const loginDetected = await tempScraper.detectCrossWindowLoginChange();
            
            if (loginDetected) {
                console.log('✅ 检测到跨窗口登录成功！');
                this.logger.sendServiceLog('检测到跨窗口登录成功！', 'success');
                
                res.json({
                    success: true,
                    message: '检测到登录状态变化',
                    isLoggedIn: true
                });
            } else {
                console.log('⚠️ 未检测到跨窗口登录状态变化');
                this.logger.sendServiceLog('未检测到跨窗口登录状态变化', 'warning');
                
                res.json({
                    success: false,
                    message: '未检测到登录状态变化',
                    isLoggedIn: false
                });
            }
            
        } catch (error) {
            console.error('跨窗口登录检测失败:', error);
            this.logger.sendErrorLog('跨窗口登录检测失败', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
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
            
            // 防止重复打开登录窗口，但允许强制重置
            if (this.isLoginWindowOpen) {
                console.log('⚠️ 检测到登录窗口状态异常，正在检查浏览器状态...');
                this.logger.sendWarningLog('检测到登录窗口状态异常，正在检查浏览器状态...');
                
                // 检查浏览器是否真的还在运行
                if (this.browserInstance && this.browserPage) {
                    try {
                        // 尝试访问页面，如果失败说明浏览器已关闭
                        await this.browserPage.url();
                        console.log('✅ 浏览器实例正常，继续使用现有窗口');
                        this.logger.sendServiceLog('浏览器实例正常，继续使用现有窗口', 'info');
                    } catch (error) {
                        console.log('⚠️ 浏览器实例已关闭，将创建新的登录窗口');
                        this.logger.sendWarningLog('浏览器实例已关闭，将创建新的登录窗口');
                        this.browserInstance = null;
                        this.browserPage = null;
                        this.isLoginWindowOpen = false;
                    }
                } else {
                    console.log('⚠️ 浏览器实例不存在，将创建新的登录窗口');
                    this.logger.sendWarningLog('浏览器实例不存在，将创建新的登录窗口');
                    this.isLoginWindowOpen = false;
                }
                
                // 如果浏览器状态正常，返回现有窗口信息
                if (this.isLoginWindowOpen) {
                    return res.json({
                        success: true,
                        message: '登录窗口已存在，请检查浏览器窗口',
                        existingWindow: true
                    });
                }
            }
            
            console.log(`🌐 正在使用用户当前浏览器打开: ${url}`);
            this.logger.sendServiceLog(`正在使用用户当前浏览器打开: ${url}`, 'info');
            
            let browserSource = 'unknown';
            let isUserBrowser = false;
            
            // 使用全局浏览器管理器获取浏览器实例
            console.log('🔧 使用全局浏览器管理器获取浏览器实例...');
            this.logger.sendServiceLog('使用全局浏览器管理器获取浏览器实例', 'info');
            
            const browserInfo = await this.globalBrowserManager.getBrowserInstance();
            this.browserInstance = browserInfo.browser;
            this.browserPage = browserInfo.page;
            this.isBrowserInitialized = browserInfo.isInitialized;
            browserSource = 'global_browser_manager';
            
            console.log('✅ 已获取全局浏览器实例');
            this.logger.sendServiceLog('已获取全局浏览器实例', 'success');
            
            // 检查是否已有页面实例，避免创建新窗口
            if (this.browserPage) {
                try {
                    await this.browserPage.evaluate(() => document.title);
                    console.log('✅ 使用现有页面实例，避免创建新窗口');
                } catch (error) {
                    console.log('⚠️ 现有页面实例无效，创建新页面');
                    this.browserPage = null;
                }
            }
            
            // 创建新页面并打开指定URL（仅在必要时）
            if (!this.browserPage) {
                try {
                    this.browserPage = await this.browserInstance.newPage();
                } catch (error) {
                    console.log(`⚠️ 创建新页面失败: ${error.message}`);
                    throw error;
                }
            }
            
            try {
                // 强制将页面置于前台，确保用户能看到
                await this.browserPage.bringToFront();
                console.log('👁️ 已将登录页面置于前台');
                this.logger.sendServiceLog('已将登录页面置于前台', 'info');
                
                // 尝试最大化窗口
                try {
                    await this.browserPage.evaluate(() => {
                        if (window.screen && window.screen.availWidth && window.screen.availHeight) {
                            window.resizeTo(window.screen.availWidth, window.screen.availHeight);
                            window.moveTo(0, 0);
                        }
                    });
                    console.log('🖥️ 已尝试最大化登录窗口');
                    this.logger.sendServiceLog('已尝试最大化登录窗口', 'info');
                } catch (error) {
                    console.log('⚠️ 无法最大化窗口，但继续执行');
                    this.logger.sendWarningLog('无法最大化窗口，但继续执行');
                }
                
                // 标记登录窗口已打开
                this.isLoginWindowOpen = true;
                
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
                    this.logger.sendServiceLog('⚠️ 重要：请勿关闭浏览器窗口，完成登录后程序会自动检测状态', 'warning');
                }
                
                // 添加窗口查找指导
                this.logger.sendServiceLog('💡 如果看不到登录窗口，请尝试以下方法：', 'info');
                this.logger.sendServiceLog('   - 按 Alt+Tab (Windows) 或 Cmd+Tab (Mac) 切换窗口', 'info');
                this.logger.sendServiceLog('   - 检查任务栏或Dock中的浏览器图标', 'info');
                this.logger.sendServiceLog('   - 查看是否有新的浏览器窗口被打开', 'info');
                this.logger.sendServiceLog('   - 检查是否有浏览器窗口在后台运行', 'info');
                
                // 监听页面关闭事件
                this.browserPage.on('close', () => {
                    this.isLoginWindowOpen = false;
                    console.log('🔒 登录窗口已关闭');
                    this.logger.sendServiceLog('登录窗口已关闭', 'info');
                });
                
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
     * 获取浏览器实例（供其他组件复用）
     * @returns {Object} 浏览器实例信息
     */
    getBrowserInstance() {
        return {
            browser: this.browserInstance,
            page: this.browserPage,
            isInitialized: this.isBrowserInitialized
        };
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
     * 处理重置登录窗口请求
     * @param {Object} req - 请求对象
     * @param {Object} res - 响应对象
     */
    async handleResetLoginWindow(req, res) {
        try {
            console.log('🔄 收到重置登录窗口请求');
            this.logger.sendServiceLog('收到重置登录窗口请求', 'info');
            
            // 重置登录窗口状态
            this.isLoginWindowOpen = false;
            
            // 关闭现有的浏览器页面（如果有）
            if (this.browserPage) {
                try {
                    await this.browserPage.close();
                    console.log('✅ 已关闭现有登录页面');
                    this.logger.sendServiceLog('已关闭现有登录页面', 'info');
                } catch (error) {
                    console.log('⚠️ 关闭页面时出现警告:', error.message);
                    this.logger.sendWarningLog(`关闭页面时出现警告: ${error.message}`);
                }
                this.browserPage = null;
            }
            
            console.log('✅ 登录窗口状态已重置');
            this.logger.sendServiceLog('登录窗口状态已重置', 'success');
            
            res.json({
                success: true,
                message: '登录窗口状态已重置，可以重新尝试登录'
            });
            
        } catch (error) {
            console.error('❌ 重置登录窗口失败:', error.message);
            this.logger.sendErrorLog(`重置登录窗口失败: ${error.message}`);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 连接到用户当前浏览器
     * @returns {Promise<Object|null>} 浏览器实例或null
     */
    async connectToUserBrowser() {
        try {
            console.log('🔧 尝试连接到用户当前浏览器...');
            this.logger.sendServiceLog('尝试连接到用户当前浏览器', 'info');
            
            // 这里可以尝试连接到用户当前运行的浏览器
            // 由于安全限制，我们暂时返回null，让系统创建新的浏览器实例
            console.log('⚠️ 无法连接到用户浏览器，将创建新的浏览器实例');
            this.logger.sendServiceLog('无法连接到用户浏览器，将创建新的浏览器实例', 'warning');
            
            return null;
        } catch (error) {
            console.error('连接用户浏览器失败:', error);
            this.logger.sendErrorLog('连接用户浏览器失败', error);
            return null;
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
