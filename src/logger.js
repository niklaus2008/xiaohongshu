/**
 * 日志管理器 - 将终端日志转发到前端显示
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

class Logger {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     * @param {Object} options.io - Socket.IO实例
     * @param {boolean} options.enableTerminal - 是否同时输出到终端
     * @param {boolean} options.enableFrontend - 是否发送到前端
     */
    constructor(options = {}) {
        this.io = options.io || null;
        this.enableTerminal = options.enableTerminal !== false; // 默认启用终端输出
        this.enableFrontend = options.enableFrontend !== false; // 默认启用前端输出
        
        // 保存原始的console方法
        this.originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info,
            debug: console.debug
        };
        
        // 初始化日志系统
        this.init();
    }

    /**
     * 初始化日志系统
     * @private
     */
    init() {
        // 重写console方法
        this.overrideConsole();
        
        // 监听未捕获的异常
        this.setupErrorHandling();
        
        console.log('📝 日志管理器已初始化 - 终端日志将转发到前端显示');
    }

    /**
     * 重写console方法
     * @private
     */
    overrideConsole() {
        const self = this;
        
        // 重写console.log
        console.log = function(...args) {
            self.log('info', args);
        };
        
        // 重写console.error
        console.error = function(...args) {
            self.log('error', args);
        };
        
        // 重写console.warn
        console.warn = function(...args) {
            self.log('warning', args);
        };
        
        // 重写console.info
        console.info = function(...args) {
            self.log('info', args);
        };
        
        // 重写console.debug
        console.debug = function(...args) {
            self.log('debug', args);
        };
    }

    /**
     * 设置错误处理
     * @private
     */
    setupErrorHandling() {
        const self = this;
        
        // 监听未捕获的异常
        process.on('uncaughtException', (error) => {
            self.log('error', [`未捕获的异常: ${error.message}`, error.stack]);
        });
        
        // 监听未处理的Promise拒绝
        process.on('unhandledRejection', (reason, promise) => {
            self.log('error', [`未处理的Promise拒绝: ${reason}`, promise]);
        });
    }

    /**
     * 记录日志
     * @param {string} level - 日志级别
     * @param {Array} args - 日志参数
     * @private
     */
    log(level, args) {
        // 格式化日志消息
        const message = this.formatMessage(args);
        const timestamp = new Date().toISOString();
        
        // 输出到终端
        if (this.enableTerminal) {
            const consoleMethod = level === 'warning' ? 'warn' : level;
            try {
                if (this.originalConsole[consoleMethod] && typeof this.originalConsole[consoleMethod] === 'function') {
                    this.originalConsole[consoleMethod](...args);
                } else {
                    // 如果方法不存在，使用log方法
                    this.originalConsole.log(...args);
                }
            } catch (error) {
                // 如果终端输出失败（如EPIPE错误），静默处理
                // 避免在日志记录过程中产生新的错误
                if (error.code !== 'EPIPE' && error.code !== 'ECONNRESET') {
                    // 只在非管道错误时记录错误，避免无限循环
                    try {
                        console.error('Logger terminal output error:', error.message);
                    } catch (logError) {
                        // 如果连错误日志都失败了，完全静默处理
                    }
                }
            }
        }
        
        // 发送到前端
        if (this.enableFrontend && this.io) {
            try {
                this.sendToFrontend({
                    timestamp,
                    level,
                    message,
                    originalArgs: args
                });
            } catch (error) {
                // 如果发送到前端失败，静默处理
                // 避免在日志记录过程中产生新的错误
            }
        }
    }

    /**
     * 格式化日志消息
     * @param {Array} args - 日志参数
     * @returns {string} 格式化后的消息
     * @private
     */
    formatMessage(args) {
        return args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (error) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
    }

    /**
     * 发送日志到前端
     * @param {Object} logEntry - 日志条目
     * @private
     */
    sendToFrontend(logEntry) {
        try {
            // 检查Socket.IO连接是否可用
            if (!this.io || !this.io.engine || this.io.engine.closed) {
                return; // 如果连接不可用，静默跳过
            }
            
            // 通过Socket.IO发送到所有连接的客户端
            this.io.emit('log', {
                timestamp: logEntry.timestamp,
                level: logEntry.level,
                message: logEntry.message,
                source: 'terminal' // 标记来源为终端
            });
        } catch (error) {
            // 如果发送失败，静默处理，避免产生新的错误
            // 特别是EPIPE错误，通常发生在客户端断开连接时
            if (error.code !== 'EPIPE' && error.code !== 'ECONNRESET') {
                // 只记录非管道错误
                try {
                    this.originalConsole.error('发送日志到前端失败:', error.message);
                } catch (consoleError) {
                    // 如果连console.error都失败，完全静默处理
                }
            }
        }
    }

    /**
     * 发送自定义日志到前端
     * @param {string} message - 日志消息
     * @param {string} level - 日志级别
     * @param {Object} data - 额外数据
     */
    sendCustomLog(message, level = 'info', data = null) {
        const timestamp = new Date().toISOString();
        
        // 输出到终端
        if (this.enableTerminal) {
            const consoleMethod = level === 'warning' ? 'warn' : level;
            if (this.originalConsole[consoleMethod] && typeof this.originalConsole[consoleMethod] === 'function') {
                this.originalConsole[consoleMethod](message);
            } else {
                // 如果方法不存在，使用log方法
                this.originalConsole.log(message);
            }
        }
        
        // 发送到前端
        if (this.enableFrontend && this.io) {
            this.io.emit('log', {
                timestamp,
                level,
                message,
                data,
                source: 'custom'
            });
        }
    }

    /**
     * 发送服务状态日志
     * @param {string} message - 状态消息
     * @param {string} level - 日志级别
     */
    sendServiceLog(message, level = 'info') {
        this.sendCustomLog(`服务状态: ${message}`, level);
    }

    /**
     * 发送任务状态日志
     * @param {string} message - 任务消息
     * @param {string} level - 日志级别
     */
    sendTaskLog(message, level = 'info') {
        this.sendCustomLog(`任务状态: ${message}`, level);
    }

    /**
     * 发送错误日志
     * @param {string} message - 错误消息
     * @param {Error} error - 错误对象
     */
    sendErrorLog(message, error = null) {
        let fullMessage = message;
        if (error) {
            fullMessage += ` - ${error.message}`;
            if (error.stack) {
                fullMessage += `\n堆栈信息: ${error.stack}`;
            }
        }
        this.sendCustomLog(fullMessage, 'error');
    }

    /**
     * 发送成功日志
     * @param {string} message - 成功消息
     */
    sendSuccessLog(message) {
        this.sendCustomLog(message, 'success');
    }

    /**
     * 发送警告日志
     * @param {string} message - 警告消息
     */
    sendWarningLog(message) {
        this.sendCustomLog(message, 'warning');
    }

    /**
     * 发送信息日志
     * @param {string} message - 信息消息
     */
    sendInfoLog(message) {
        this.sendCustomLog(message, 'info');
    }

    /**
     * 设置Socket.IO实例
     * @param {Object} io - Socket.IO实例
     */
    setSocketIO(io) {
        this.io = io;
        console.log('📡 Socket.IO已连接到日志管理器');
    }

    /**
     * 启用/禁用终端输出
     * @param {boolean} enable - 是否启用
     */
    setTerminalOutput(enable) {
        this.enableTerminal = enable;
        console.log(`📺 终端输出已${enable ? '启用' : '禁用'}`);
    }

    /**
     * 启用/禁用前端输出
     * @param {boolean} enable - 是否启用
     */
    setFrontendOutput(enable) {
        this.enableFrontend = enable;
        console.log(`🌐 前端输出已${enable ? '启用' : '禁用'}`);
    }

    /**
     * 恢复原始console方法
     */
    restore() {
        console.log = this.originalConsole.log;
        console.error = this.originalConsole.error;
        console.warn = this.originalConsole.warn;
        console.info = this.originalConsole.info;
        console.debug = this.originalConsole.debug;
        
        console.log('🔄 已恢复原始console方法');
    }

    /**
     * 获取日志统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            enableTerminal: this.enableTerminal,
            enableFrontend: this.enableFrontend,
            hasSocketIO: !!this.io,
            socketIOConnected: this.io ? this.io.engine.clientsCount > 0 : false
        };
    }
}

// 创建全局日志管理器实例
let globalLogger = null;

/**
 * 获取全局日志管理器实例
 * @param {Object} options - 配置选项
 * @returns {Logger} 日志管理器实例
 */
function getLogger(options = {}) {
    if (!globalLogger) {
        globalLogger = new Logger(options);
    } else {
        // 如果已存在实例，直接更新配置，避免递归调用
        if (options.io) {
            globalLogger.io = options.io;
        }
        if (options.enableTerminal !== undefined) {
            globalLogger.enableTerminal = options.enableTerminal;
        }
        if (options.enableFrontend !== undefined) {
            globalLogger.enableFrontend = options.enableFrontend;
        }
    }
    return globalLogger;
}

/**
 * 初始化全局日志管理器
 * @param {Object} options - 配置选项
 * @returns {Logger} 日志管理器实例
 */
function initLogger(options = {}) {
    // 如果已存在全局日志管理器，先恢复原始console方法
    if (globalLogger) {
        globalLogger.restore();
    }
    
    // 创建新的日志管理器实例
    globalLogger = new Logger(options);
    return globalLogger;
}

module.exports = {
    Logger,
    getLogger,
    initLogger
};
