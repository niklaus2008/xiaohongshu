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
            headless: true,
            delay: 2000,
            timeout: 30000,
            tryRemoveWatermark: true,
            enableImageProcessing: true,
            maxConcurrent: 2, // 最大并发数
            ...options.options
        };
        this.io = options.io;
        
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
    }

    /**
     * 开始批量处理
     */
    async start() {
        try {
            this.log('开始批量下载任务', 'info');
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
            
            // 开始处理任务
            await this.processTasks();
            
        } catch (error) {
            this.log(`批量处理启动失败: ${error.message}`, 'error');
            this._isRunning = false;
            this.emitStatus();
            throw error;
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
                await this.waitForTaskCompletion();
                continue;
            }
            
            const task = this.taskQueue[this.currentIndex];
            if (task.status === 'pending') {
                this.processTask(task);
            }
            
            this.currentIndex++;
        }
        
        // 等待所有活跃任务完成
        while (this.activeTasks.size > 0) {
            await this.waitForTaskCompletion();
        }
        
        // 所有任务完成
        if (this._isRunning) {
            this.complete();
        }
    }

    /**
     * 处理单个任务
     * @param {Object} task - 任务对象
     * @private
     */
    async processTask(task) {
        try {
            task.status = 'processing';
            this.activeTasks.add(task);
            
            // 更新餐馆进度状态
            this.updateRestaurantProgress(task.index, 'processing', 0, 0, 0);
            
            const { restaurant } = task;
            this.log(`开始处理餐馆: ${restaurant.name} (${restaurant.location})`, 'info');
            
            // 创建爬虫实例，使用已保存的Cookie
            const scraper = new XiaohongshuScraper({
                downloadPath: this.outputPath,
                maxImages: restaurant.maxImages || this.options.maxImages,
                headless: this.options.headless,
                delay: this.options.delay,
                timeout: this.options.timeout,
                tryRemoveWatermark: this.options.tryRemoveWatermark,
                enableImageProcessing: this.options.enableImageProcessing,
                login: {
                    method: 'manual',
                    autoLogin: true,
                    saveCookies: true,
                    cookieFile: './cookies.json'
                }
            });
            
            task.scraper = scraper;
            
            // 执行搜索和下载
            const result = await scraper.searchAndDownload(restaurant.name, restaurant.location);
            
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
            this.errors.push({
                restaurant: task.restaurant.name,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            // 更新餐馆进度为失败状态
            this.updateRestaurantProgress(task.index, 'failed', 0, 0, 0);
        } finally {
            // 清理资源
            if (task.scraper) {
                await task.scraper.close();
            }
            this.activeTasks.delete(task);
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
            const checkInterval = setInterval(() => {
                if (this.activeTasks.size < this.options.maxConcurrent || !this._isRunning) {
                    clearInterval(checkInterval);
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
        this._isRunning = false;
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
        
        this.emitStatus();
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
        
        // 发送日志到客户端
        if (this.io) {
            this.io.emit('log', logEntry);
        }
        
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
