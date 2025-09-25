/**
 * 批量处理器 - 管理多个餐馆的图片下载任务
 * 提供进度跟踪、错误处理和实时状态更新
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const { XiaohongshuScraper } = require('./xiaohongshu-scraper');
const fs = require('fs-extra');
const path = require('path');
const globalLoginManager = require('./global-login-manager');

class BatchProcessor {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     * @param {Array} options.restaurants - 餐馆列表
     * @param {string} options.outputPath - 输出路径
     * @param {Object} options.options - 下载选项
     * @param {Object} options.io - Socket.IO实例
     */
    constructor(options) {
        this.restaurants = options.restaurants || [];
        this.outputPath = options.outputPath;
        this.options = {
            maxImages: 20,
            headless: false, // 显示浏览器窗口，确保用户能看到登录页面
            delay: 2000,
            timeout: 30000,
            tryRemoveWatermark: true,
            enableImageProcessing: true,
            maxConcurrent: 2, // 最大并发数
            ...options.options
        };
        this.io = options.io;
        this.logger = options.logger; // 日志管理器
        this.webInterface = options.webInterface; // Web界面实例
        
        // 状态管理
        this._isRunning = false;
        this.isPaused = false;
        this.currentIndex = 0;
        this.completedCount = 0;
        this.totalImages = 0;
        this.downloadedImages = 0;
        this.errors = [];
        this.logs = [];
        
        // 任务队列
        this.taskQueue = [];
        this.activeTasks = new Set();
        
        // 餐馆进度跟踪
        this.restaurantProgress = [];
        
        // 统计信息
        this.stats = {
            startTime: null,
            endTime: null,
            totalRestaurants: this.restaurants.length,
            completedRestaurants: 0,
            failedRestaurants: 0,
            totalImages: 0,
            downloadedImages: 0,
            failedImages: 0
        };
        
        // 共享登录状态
        this.sharedLoginState = null;
    }

    /**
     * 开始批量处理
     */
    async start() {
        try {
            this.log('🧹 已清空之前的未完成任务', 'info');
            this.log('🚀 开始批量下载任务', 'info');
            
            // 重置全局登录状态
            globalLoginManager.reset();
            this.log('🔄 已重置全局登录状态管理器', 'info');
            this.log(`📊 总餐馆数: ${this.restaurants.length}`, 'info');
            this.log(`📁 输出目录: ${this.outputPath}`, 'info');
            this.log(`🖼️ 每个餐馆最大图片数: ${this.options.maxImages}`, 'info');
            this.log(`⏱️ 请求间隔: ${this.options.delay}ms`, 'info');
            this.log(`🎯 去水印: ${this.options.tryRemoveWatermark ? '启用' : '禁用'}`, 'info');
            this.log(`🖼️ 图片处理: ${this.options.enableImageProcessing ? '启用' : '禁用'}`, 'info');
            this.log(`🔄 最大并发数: ${this.options.maxConcurrent}`, 'info');
            this._isRunning = true;
            this.isPaused = false;
            this.stats.startTime = new Date();
            
            // 初始化任务队列
            this.taskQueue = this.restaurants.map((restaurant, index) => ({
                index,
                restaurant,
                status: 'pending'
            }));
            
            // 初始化餐馆进度
            this.restaurantProgress = this.restaurants.map((restaurant, index) => ({
                index,
                name: restaurant.name,
                location: restaurant.location,
                status: 'pending',
                progress: 0,
                images: 0,
                downloaded: 0
            }));
            
            this.emitStatus();
            
            // 新增：预登录阶段
            this.log(`🔐 开始预登录阶段...`, 'info');
            console.log('🚀 启动预登录功能，避免重复登录问题...');
            const loginSuccess = await this.preLogin();
            if (!loginSuccess) {
                console.error('❌ 预登录失败，系统将回退到旧登录逻辑');
                this.log('⚠️ 预登录失败，将使用传统登录方式', 'warning');
            } else {
                console.log('✅ 预登录成功，所有爬虫实例将共享登录状态');
                this.log(`✅ 预登录完成，开始批量处理...`, 'success');
            }
            
            // 开始处理任务
            this.log(`🎯 开始处理任务队列...`, 'info');
            await this.processTasks();
            
        } catch (error) {
            this.log(`批量处理启动失败: ${error.message}`, 'error');
            this._isRunning = false;
            this.emitStatus();
            throw error;
        }
    }

    /**
     * 预登录阶段 - 统一登录，避免重复登录
     * @private
     * @returns {Promise<boolean>} 登录是否成功
     */
    async preLogin() {
        try {
            // 发送预登录开始状态
            this.emitPreLoginStatus(true, 10);
            this.log('🔧 创建登录实例...', 'info');
            
            // 优先使用WebInterface的浏览器实例，避免重复创建
            let loginScraper;
            const browserInfo = this.webInterface ? this.webInterface.getBrowserInstance() : null;
            if (browserInfo && browserInfo.browser && browserInfo.isInitialized) {
                this.log('♻️ 复用WebInterface的浏览器实例...', 'info');
                
                // 使用WebInterface的浏览器实例创建爬虫
                loginScraper = new XiaohongshuScraper({
                    headless: false,
                    browserType: 'chromium',
                    login: {
                        method: 'manual',
                        autoLogin: true,
                        saveCookies: true,
                        cookieFile: './cookies.json'
                    }
                });
                
                // 直接使用WebInterface的浏览器实例
                loginScraper.browser = browserInfo.browser;
                loginScraper.page = browserInfo.page;
                loginScraper.isBrowserInitialized = true;
                
                this.log('✅ 已复用WebInterface的浏览器实例', 'success');
            } else {
                this.log('🔧 创建新的登录实例...', 'info');
                
                // 创建新的登录实例
                const { XiaohongshuScraper } = require('./xiaohongshu-scraper');
                loginScraper = new XiaohongshuScraper({
                    headless: false, // 显示浏览器窗口，让用户看到登录过程
                    browserType: 'chromium',
                    login: {
                        method: 'manual',
                        autoLogin: true,
                        saveCookies: true,
                        cookieFile: './cookies.json'
                    }
                });
                
                // 设置Web接口实例，用于前端状态同步
                if (this.webInterface) {
                    loginScraper.setWebInterface(this.webInterface);
                }
                
                // 发送预登录进度更新
                this.emitPreLoginStatus(true, 30);
                this.log('🚀 初始化浏览器...', 'info');
                // 初始化浏览器
                await loginScraper.initBrowser();
            }
            
            // 发送预登录进度更新
            this.emitPreLoginStatus(true, 60);
            this.log('🔐 开始登录流程...', 'info');
            // 执行登录
            const loginSuccess = await loginScraper.autoLogin();
            
            if (loginSuccess) {
                // 发送预登录进度更新
                this.emitPreLoginStatus(true, 90);
                this.log('✅ 登录成功，保存共享状态...', 'success');
                
                // 获取当前页面的Cookie
                const cookies = await loginScraper.page.context().cookies();
                
                // 保存登录状态，供后续爬虫使用
                this.sharedLoginState = {
                    isLoggedIn: true,
                    browser: loginScraper.browser,
                    page: loginScraper.page,
                    cookies: cookies,
                    scraper: loginScraper // 保持爬虫实例引用
                };
                
                // 发送预登录完成状态
                this.emitPreLoginStatus(false, 100);
                this.log('🎉 预登录完成，所有爬虫实例将共享此登录状态', 'success');
                
                // 重置全局登录状态，避免后续实例被阻止
                const globalLoginManager = require('./global-login-manager');
                globalLoginManager.resetReopenCount();
                
                return true;
            } else {
                this.log('❌ 登录失败，清理资源...', 'error');
                await loginScraper.close();
                // 发送预登录失败状态
                this.emitPreLoginStatus(false, 0);
                return false;
            }
        } catch (error) {
            this.log(`预登录失败: ${error.message}`, 'error');
            // 发送预登录失败状态
            this.emitPreLoginStatus(false, 0);
            return false;
        }
    }

    /**
     * 发送预登录状态更新
     * @private
     * @param {boolean} isPreLogin - 是否正在预登录
     * @param {number} progress - 预登录进度 (0-100)
     */
    emitPreLoginStatus(isPreLogin, progress) {
        if (this.io) {
            this.io.emit('preLoginStatus', {
                isPreLogin: isPreLogin,
                progress: progress,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * 清理共享登录状态
     * @private
     */
    async cleanupSharedLoginState() {
        if (this.sharedLoginState && this.sharedLoginState.scraper) {
            try {
                this.log('🧹 清理共享登录状态...', 'info');
                await this.sharedLoginState.scraper.close();
                this.sharedLoginState = null;
                this.log('✅ 共享登录状态已清理', 'info');
            } catch (error) {
                this.log(`⚠️ 清理共享登录状态时出错: ${error.message}`, 'warning');
            }
        }
    }

    /**
     * 停止批量处理
     */
    async stop() {
        try {
            this.log('正在停止批量下载任务...', 'info');
            this._isRunning = false;
            this.isPaused = false;
            
            // 清理共享登录状态
            await this.cleanupSharedLoginState();
            
            // 停止所有活跃任务
            for (const task of this.activeTasks) {
                if (task.scraper) {
                    await task.scraper.close();
                }
            }
            this.activeTasks.clear();
            
            this.stats.endTime = new Date();
            this.log('批量下载任务已停止', 'info');
            this.emitStatus();
            
        } catch (error) {
            this.log(`停止任务失败: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * 暂停批量处理
     */
    pause() {
        this.isPaused = true;
        this.log('任务已暂停', 'info');
        this.emitStatus();
    }

    /**
     * 恢复批量处理
     */
    resume() {
        this.isPaused = false;
        this.log('任务已恢复', 'info');
        this.emitStatus();
        
        // 继续处理任务
        if (this._isRunning && !this.isPaused) {
            this.processTasks();
        }
    }

    /**
     * 处理任务队列
     * @private
     */
    async processTasks() {
        while (this._isRunning && !this.isPaused && this.currentIndex < this.taskQueue.length) {
            // 检查并发限制
            if (this.activeTasks.size >= this.options.maxConcurrent) {
                this.log(`⏳ 等待并发任务完成 (当前活跃任务: ${this.activeTasks.size}/${this.options.maxConcurrent})`, 'info');
                await this.waitForTaskCompletion();
                continue;
            }
            
            const task = this.taskQueue[this.currentIndex];
            if (task.status === 'pending') {
                this.log(`🚀 启动任务: ${task.restaurant.name}`, 'info');
                this.processTask(task);
            }
            
            this.currentIndex++;
        }
        
        // 等待所有活跃任务完成
        if (this.activeTasks.size > 0) {
            this.log(`⏳ 等待所有活跃任务完成 (剩余: ${this.activeTasks.size})`, 'info');
            while (this.activeTasks.size > 0) {
                await this.waitForTaskCompletion();
            }
        }
        
        // 所有任务完成 - 无论_isRunning状态如何，都要调用complete()
        this.complete();
    }

    /**
     * 处理单个任务
     * @param {Object} task - 任务对象
     * @private
     */
    async processTask(task) {
        const startTime = Date.now();
        const TASK_TIMEOUT = 300000; // 5分钟超时
        let timeoutId = null;
        
        try {
            this.log(`🚀 开始处理任务: ${task.restaurant.name}`, 'info');
            task.status = 'processing';
            this.activeTasks.add(task);
            
            // 设置超时机制
            timeoutId = setTimeout(() => {
                this.log(`⏰ 任务超时: ${task.restaurant.name} (超过5分钟)`, 'error');
                task.status = 'timeout';
                task.error = '任务执行超时';
            }, TASK_TIMEOUT);
            
            // 更新餐馆进度状态
            this.updateRestaurantProgress(task.index, 'processing', 0, 0, 0);
            
            const { restaurant } = task;
            this.log(`开始处理餐馆: ${restaurant.name} (${restaurant.location})`, 'info');
            this.log(`📊 任务进度: ${this.currentIndex + 1}/${this.restaurants.length}`, 'info');
            
            // 创建爬虫实例，使用已保存的Cookie
            this.log(`🔧 正在初始化爬虫实例...`, 'info');
            const scraperStartTime = Date.now();
            const scraper = new XiaohongshuScraper({
                downloadPath: this.outputPath,
                maxImages: restaurant.maxImages || this.options.maxImages,
                headless: this.options.headless,
                delay: this.options.delay,
                timeout: this.options.timeout,
                tryRemoveWatermark: this.options.tryRemoveWatermark,
                enableImageProcessing: this.options.enableImageProcessing,
                logger: this.logger, // 传递日志管理器
                login: {
                    method: 'manual',
                    autoLogin: true,
                    saveCookies: true,
                    cookieFile: './cookies.json'
                },
                logCallback: (message, level) => {
                    // 将爬虫的日志转发到批量处理器
                    this.log(message, level);
                }
            });
            
            // 为每个爬虫实例设置唯一的实例ID，避免状态混乱
            scraper.instanceId = `scraper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.log(`🆔 爬虫实例ID: ${scraper.instanceId}`, 'info');
            
            // 设置Web接口实例，用于前端状态同步
            if (this.webInterface) {
                scraper.setWebInterface(this.webInterface);
            }
            
            // 初始化爬虫实例的浏览器实例
            this.log(`🚀 初始化爬虫实例浏览器...`, 'info');
            await scraper.initBrowser();
            
            // 设置共享登录状态，避免重复登录
            if (this.sharedLoginState) {
                scraper.setSharedLoginState(this.sharedLoginState);
                this.log(`🔄 为餐馆 "${restaurant.name}" 设置共享登录状态`, 'info');
            }
            
            task.scraper = scraper;
            const scraperInitTime = Date.now() - scraperStartTime;
            this.log(`✅ 爬虫实例初始化完成 (耗时: ${scraperInitTime}ms)`, 'info');
            
            // 执行搜索和下载
            this.log(`🔍 开始搜索和下载图片...`, 'info');
            const searchStartTime = Date.now();
            const result = await scraper.searchAndDownload(restaurant.name, restaurant.location);
            const searchTime = Date.now() - searchStartTime;
            this.log(`⏱️ 搜索和下载完成 (耗时: ${searchTime}ms)`, 'info');
            
            // 清除超时
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            // 更新统计信息
            this.stats.totalImages += result.totalFound || 0;
            this.stats.downloadedImages += result.downloadedCount || 0;
            this.stats.failedImages += result.failedCount || 0;
            
            if (result.success) {
                this.stats.completedRestaurants++;
                this.log(`✅ 餐馆处理完成: ${restaurant.name} - 下载 ${result.downloadedCount} 张图片`, 'success');
                // 更新餐馆进度为完成状态
                this.updateRestaurantProgress(task.index, 'completed', 100, result.totalFound || 0, result.downloadedCount || 0);
            } else {
                this.stats.failedRestaurants++;
                this.log(`❌ 餐馆处理失败: ${restaurant.name} - ${result.error}`, 'error');
                this.errors.push({
                    restaurant: restaurant.name,
                    error: result.error,
                    timestamp: new Date().toISOString()
                });
                // 更新餐馆进度为失败状态
                this.updateRestaurantProgress(task.index, 'failed', 0, 0, 0);
            }
            
            task.status = 'completed';
            task.result = result;
            
        } catch (error) {
            task.status = 'failed';
            task.error = error.message;
            this.stats.failedRestaurants++;
            this.log(`❌ 餐馆处理异常: ${task.restaurant.name} - ${error.message}`, 'error');
            this.log(`📊 错误堆栈: ${error.stack}`, 'error');
            this.errors.push({
                restaurant: task.restaurant.name,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            // 更新餐馆进度为失败状态
            this.updateRestaurantProgress(task.index, 'failed', 0, 0, 0);
        } finally {
            // 清除超时
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            // 清理资源
            const totalTime = Date.now() - startTime;
            this.log(`🧹 正在清理资源... (任务总耗时: ${totalTime}ms)`, 'info');
            if (task.scraper) {
                try {
                    // 注意：如果使用了共享登录状态，不要关闭共享的浏览器实例
                    if (!this.sharedLoginState || task.scraper.browser !== this.sharedLoginState.browser) {
                        await task.scraper.close();
                        this.log(`✅ 爬虫实例已关闭`, 'info');
                    } else {
                        this.log(`🔄 跳过关闭共享浏览器实例`, 'info');
                    }
                } catch (closeError) {
                    this.log(`⚠️ 关闭爬虫实例时出错: ${closeError.message}`, 'warning');
                }
            }
            this.activeTasks.delete(task);
            this.log(`✅ 资源清理完成，活跃任务数: ${this.activeTasks.size}`, 'info');
            this.emitStatus();
        }
    }

    /**
     * 更新餐馆进度
     * @param {number} index - 餐馆索引
     * @param {string} status - 状态
     * @param {number} progress - 进度百分比
     * @param {number} images - 图片总数
     * @param {number} downloaded - 已下载数量
     * @private
     */
    updateRestaurantProgress(index, status, progress, images, downloaded) {
        if (this.restaurantProgress[index]) {
            this.restaurantProgress[index].status = status;
            this.restaurantProgress[index].progress = progress;
            this.restaurantProgress[index].images = images;
            this.restaurantProgress[index].downloaded = downloaded;
        }
    }

    /**
     * 等待任务完成
     * @private
     */
    async waitForTaskCompletion() {
        return new Promise((resolve) => {
            let checkCount = 0;
            const checkInterval = setInterval(() => {
                checkCount++;
                
                // 每30秒输出一次等待状态，减少日志频率
                if (checkCount % 30 === 0) {
                    const activeTaskDetails = Array.from(this.activeTasks).map(task => {
                        return {
                            restaurant: task.restaurant?.name || 'Unknown',
                            status: task.status,
                            hasScraper: !!task.scraper
                        };
                    });
                    
                    this.log(`⏳ 等待任务完成中... (活跃任务: ${this.activeTasks.size}/${this.options.maxConcurrent}, 已等待: ${checkCount}秒)`, 'info');
                    this.log(`📊 活跃任务详情: ${JSON.stringify(activeTaskDetails)}`, 'info');
                    this.log(`🔄 当前索引: ${this.currentIndex}/${this.taskQueue.length}`, 'info');
                }
                
                if (this.activeTasks.size < this.options.maxConcurrent || !this._isRunning) {
                    clearInterval(checkInterval);
                    // 只在有活跃任务完成时才输出日志，避免频繁输出
                    if (this.activeTasks.size > 0) {
                        this.log(`✅ 等待完成，活跃任务数: ${this.activeTasks.size}`, 'info');
                    }
                    resolve();
                }
            }, 1000);
        });
    }

    /**
     * 完成所有任务
     * @private
     */
    complete() {
        // 确保任务状态为完成
        this._isRunning = false;
        this.isPaused = false;
        this.stats.endTime = new Date();
        
        const duration = this.stats.endTime - this.stats.startTime;
        const durationMinutes = Math.round(duration / 60000);
        
        this.log(`🎉 批量下载任务完成！`, 'success');
        this.log(`📊 统计信息:`, 'info');
        this.log(`   - 总餐馆数: ${this.stats.totalRestaurants}`, 'info');
        this.log(`   - 成功: ${this.stats.completedRestaurants}`, 'info');
        this.log(`   - 失败: ${this.stats.failedRestaurants}`, 'info');
        this.log(`   - 总图片数: ${this.stats.totalImages}`, 'info');
        this.log(`   - 下载成功: ${this.stats.downloadedImages}`, 'info');
        this.log(`   - 下载失败: ${this.stats.failedImages}`, 'info');
        this.log(`   - 耗时: ${durationMinutes} 分钟`, 'info');
        
        // 更新所有餐馆进度为完成状态
        this.restaurantProgress.forEach((progress, index) => {
            if (progress.status === 'processing' || progress.status === 'pending') {
                progress.status = 'completed';
                progress.progress = 100;
            }
        });
        
        // 发送最终状态更新
        this.emitStatus();
        
        // 通知Web界面任务已完成，可以停止心跳检测
        if (this.webInterface) {
            // 直接调用Web界面的方法停止心跳检测
            this.webInterface.stopHeartbeat();
            
            // 发送任务完成通知到所有客户端
            this.io.emit('task_completed', {
                timestamp: new Date().toISOString(),
                message: '所有任务已完成，停止心跳检测',
                stats: this.stats,
                restaurantProgress: this.restaurantProgress
            });
            
            // 发送最终完成通知
            this.io.emit('task_final_completed', {
                timestamp: new Date().toISOString(),
                message: '所有任务已完成，前端日志将停止',
                stats: this.stats,
                restaurantProgress: this.restaurantProgress
            });
        }
        
        this.log(`✅ 任务完成事件已发送，心跳检测应该停止`, 'success');
    }

    /**
     * 记录日志
     * @param {string} message - 日志消息
     * @param {string} level - 日志级别
     * @private
     */
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message
        };
        
        this.logs.push(logEntry);
        
        // 保持日志数量在合理范围内
        if (this.logs.length > 1000) {
            this.logs = this.logs.slice(-500);
        }
        
        // 发送日志到客户端（已禁用）
        // if (this.io) {
        //     this.io.emit('log', logEntry);
        // }
        
        // 控制台输出
        const levelEmoji = {
            'info': 'ℹ️',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌'
        };
        
        console.log(`${levelEmoji[level] || 'ℹ️'} ${message}`);
    }

    /**
     * 发送状态更新
     * @private
     */
    emitStatus() {
        if (this.io) {
            this.io.emit('status', this.getStatus());
        }
    }

    /**
     * 获取当前状态
     * @returns {Object} 状态信息
     */
    getStatus() {
        const progress = this.stats.totalRestaurants > 0 ? 
            (this.stats.completedRestaurants + this.stats.failedRestaurants) / this.stats.totalRestaurants * 100 : 0;
        
        const currentTask = this.taskQueue[this.currentIndex];
        const currentRestaurant = currentTask ? currentTask.restaurant : null;
        
        return {
            isRunning: this._isRunning,
            isPaused: this.isPaused,
            progress: Math.round(progress),
            currentRestaurant: currentRestaurant ? {
                name: currentRestaurant.name,
                location: currentRestaurant.location
            } : null,
            totalRestaurants: this.stats.totalRestaurants,
            completedRestaurants: this.stats.completedRestaurants,
            failedRestaurants: this.stats.failedRestaurants,
            totalImages: this.stats.totalImages,
            downloadedImages: this.stats.downloadedImages,
            failedImages: this.stats.failedImages,
            activeTasks: this.activeTasks.size,
            errors: this.errors.slice(-10), // 只返回最近10个错误
            restaurantProgress: this.restaurantProgress, // 添加餐馆进度信息
            stats: this.stats
        };
    }

    /**
     * 获取日志
     * @returns {Array} 日志列表
     */
    getLogs() {
        return this.logs;
    }

    /**
     * 检查是否正在运行
     * @returns {boolean} 是否正在运行
     */
    isRunning() {
        return this._isRunning;
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            duration: this.stats.endTime ? 
                this.stats.endTime - this.stats.startTime : 
                Date.now() - this.stats.startTime
        };
    }
}

module.exports = { BatchProcessor };
