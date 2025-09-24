/**
 * 全局登录状态管理器
 * 用于协调多个爬虫实例的登录状态，避免重复处理
 */

class GlobalLoginManager {
    constructor() {
        // 全局登录状态
        this._globalState = {
            isReopening: false,
            lastReopenTime: 0,
            reopenCount: 0,
            activeInstances: new Set(),
            lastLoginCheck: 0
        };
        
        // 全局日志缓存
        this._logCache = new Map();
        this._logCacheTimeout = 5000; // 5秒内相同日志只记录一次
        
        // 全局锁文件路径
        this._lockFile = './login.lock';
    }

    /**
     * 检查是否可以开始登录处理
     * @param {string} instanceId - 爬虫实例ID
     * @returns {boolean} 是否可以开始处理
     */
    canStartLoginProcess(instanceId) {
        const now = Date.now();
        
        // 检查是否正在重新打开登录页面
        if (this._globalState.isReopening && now - this._globalState.lastReopenTime < 30000) {
            console.log(`⏳ 全局状态：正在重新打开登录页面，实例 ${instanceId} 等待中...`);
            return false;
        }
        
        // 检查重新打开次数
        if (this._globalState.reopenCount >= 3) {
            console.log(`⚠️ 全局状态：重新打开登录页面次数过多，实例 ${instanceId} 跳过处理`);
            return false;
        }
        
        // 检查登录检查频率
        if (now - this._globalState.lastLoginCheck < 5000) {
            console.log(`⏳ 全局状态：登录检查过于频繁，实例 ${instanceId} 跳过检查`);
            return false;
        }
        
        return true;
    }

    /**
     * 开始登录处理
     * @param {string} instanceId - 爬虫实例ID
     * @returns {boolean} 是否成功开始处理
     */
    startLoginProcess(instanceId) {
        if (!this.canStartLoginProcess(instanceId)) {
            return false;
        }
        
        const now = Date.now();
        this._globalState.isReopening = true;
        this._globalState.lastReopenTime = now;
        this._globalState.reopenCount++;
        this._globalState.lastLoginCheck = now;
        this._globalState.activeInstances.add(instanceId);
        
        console.log(`🔄 全局状态：实例 ${instanceId} 开始处理登录，当前活跃实例: ${this._globalState.activeInstances.size}`);
        return true;
    }

    /**
     * 完成登录处理
     * @param {string} instanceId - 爬虫实例ID
     * @param {boolean} success - 是否成功
     */
    finishLoginProcess(instanceId, success) {
        this._globalState.activeInstances.delete(instanceId);
        
        if (success) {
            // 登录成功，重置所有状态
            this._globalState.isReopening = false;
            this._globalState.reopenCount = 0;
            console.log(`✅ 全局状态：实例 ${instanceId} 登录成功，重置全局状态`);
        } else {
            // 登录失败，保持重新打开状态
            console.log(`❌ 全局状态：实例 ${instanceId} 登录失败，保持重新打开状态`);
        }
        
        console.log(`📊 全局状态：当前活跃实例: ${this._globalState.activeInstances.size}`);
    }

    /**
     * 检查全局登录状态
     * @returns {Object} 全局状态信息
     */
    getGlobalState() {
        return {
            isReopening: this._globalState.isReopening,
            lastReopenTime: this._globalState.lastReopenTime,
            reopenCount: this._globalState.reopenCount,
            activeInstances: Array.from(this._globalState.activeInstances),
            lastLoginCheck: this._globalState.lastLoginCheck
        };
    }

    /**
     * 全局日志记录（带去重）
     * @param {string} message - 日志消息
     * @param {string} level - 日志级别
     * @param {string} instanceId - 实例ID
     */
    log(message, level = 'info', instanceId = 'global') {
        // 日志去重检查
        const logKey = `${message}_${level}`;
        const now = Date.now();
        const lastLogTime = this._logCache.get(logKey);
        
        if (lastLogTime && now - lastLogTime < this._logCacheTimeout) {
            // 相同日志在5秒内已记录过，跳过
            return;
        }
        
        // 更新日志缓存
        this._logCache.set(logKey, now);
        
        // 记录日志
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${instanceId}] ${message}`;
        
        switch (level) {
            case 'error':
                console.error(logMessage);
                break;
            case 'warning':
                console.warn(logMessage);
                break;
            case 'success':
                console.log(`✅ ${logMessage}`);
                break;
            case 'info':
            default:
                console.log(`ℹ️ ${logMessage}`);
                break;
        }
    }

    /**
     * 重置全局状态
     */
    reset() {
        this._globalState = {
            isReopening: false,
            lastReopenTime: 0,
            reopenCount: 0,
            activeInstances: new Set(),
            lastLoginCheck: 0
        };
        this._logCache.clear();
        console.log('🔄 全局登录状态已重置');
    }
}

// 创建全局单例
const globalLoginManager = new GlobalLoginManager();

module.exports = globalLoginManager;
