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
            lastLoginCheck: 0,
            loginCooldown: false, // 登录冷却期
            loginCooldownEnd: 0    // 登录冷却期结束时间
        };
        
        // 全局日志缓存
        this._logCache = new Map();
        this._logCacheTimeout = 5000; // 5秒内相同日志只记录一次
        
        // 全局锁文件路径
        this._lockFile = './login.lock';
        
        // 处理锁，防止竞态条件
        this._isProcessing = false;
    }

    /**
     * 检查是否可以开始登录处理
     * @param {string} instanceId - 爬虫实例ID
     * @returns {boolean} 是否可以开始处理
     */
    canStartLoginProcess(instanceId) {
        const now = Date.now();
        
        // 检查是否已经有活跃实例在处理登录
        if (this._globalState.activeInstances.size > 0) {
            console.log(`⏳ 全局状态：已有实例正在处理登录，实例 ${instanceId} 等待中... (活跃实例: ${this._globalState.activeInstances.size})`);
            return false;
        }
        
        // 检查是否正在重新打开登录页面（延长等待时间到2分钟，给用户更多时间完成扫码登录）
        if (this._globalState.isReopening && now - this._globalState.lastReopenTime < 120000) {
            console.log(`⏳ 全局状态：正在重新打开登录页面，实例 ${instanceId} 等待中... (剩余时间: ${Math.ceil((120000 - (now - this._globalState.lastReopenTime)) / 1000)}秒)`);
            return false;
        }
        
        // 检查重新打开次数（降低限制，防止过度重试）
        if (this._globalState.reopenCount >= 5) {
            console.log(`⚠️ 全局状态：重新打开登录页面次数过多，实例 ${instanceId} 跳过处理 (重试次数: ${this._globalState.reopenCount})`);
            return false;
        }
        
        // 检查登录冷却期（如果正在冷却期，跳过登录检查）
        if (this._globalState.loginCooldown && now < this._globalState.loginCooldownEnd) {
            console.log(`⏳ 全局状态：登录冷却期中，实例 ${instanceId} 跳过检查 (剩余时间: ${Math.ceil((this._globalState.loginCooldownEnd - now) / 1000)}秒)`);
            return false;
        }
        
        // 检查登录检查频率（增加间隔时间到30秒，避免频繁检测）
        if (now - this._globalState.lastLoginCheck < 30000) {
            console.log(`⏳ 全局状态：登录检查过于频繁，实例 ${instanceId} 跳过检查 (剩余时间: ${Math.ceil((30000 - (now - this._globalState.lastLoginCheck)) / 1000)}秒)`);
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
        // 使用同步锁防止竞态条件
        if (this._isProcessing) {
            console.log(`⏳ 全局状态：实例 ${instanceId} 等待中，其他实例正在处理...`);
            return false;
        }
        
        // 设置处理锁
        this._isProcessing = true;
        
        try {
            // 五重检查：确保没有其他实例正在处理（防止竞态条件）
            if (this._globalState.activeInstances.size > 0) {
                console.log(`⚠️ 全局状态：实例 ${instanceId} 启动时发现其他实例正在处理，拒绝启动`);
                this._isProcessing = false;
                return false;
            }
            
            // 检查是否正在重新打开登录页面
            const now = Date.now();
            if (this._globalState.isReopening && now - this._globalState.lastReopenTime < 120000) {
                console.log(`⏳ 全局状态：正在重新打开登录页面，实例 ${instanceId} 等待中...`);
                this._isProcessing = false;
                return false;
            }
            
            // 检查登录冷却期
            if (this._globalState.loginCooldown && now < this._globalState.loginCooldownEnd) {
                console.log(`⏳ 全局状态：登录冷却期中，实例 ${instanceId} 跳过检查`);
                this._isProcessing = false;
                return false;
            }
            
            // 检查登录检查频率
            if (now - this._globalState.lastLoginCheck < 30000) {
                console.log(`⏳ 全局状态：登录检查过于频繁，实例 ${instanceId} 跳过检查`);
                this._isProcessing = false;
                return false;
            }
            
            // 原子性操作：先设置状态，再添加实例
            this._globalState.isReopening = true;
            this._globalState.lastReopenTime = now;
            this._globalState.reopenCount++;
            this._globalState.lastLoginCheck = now;
            
            // 再次检查：确保在设置状态期间没有其他实例启动
            if (this._globalState.activeInstances.size > 0) {
                console.log(`⚠️ 全局状态：实例 ${instanceId} 在设置状态时发现其他实例，回滚状态`);
                this._globalState.isReopening = false;
                this._globalState.reopenCount--;
                this._isProcessing = false;
                return false;
            }
            
            // 添加实例到活跃列表
            this._globalState.activeInstances.add(instanceId);
            
            console.log(`🔄 全局状态：实例 ${instanceId} 开始处理登录，当前活跃实例: ${this._globalState.activeInstances.size}`);
            console.log(`📊 全局状态详情：重试次数=${this._globalState.reopenCount}, 最后检查=${new Date(this._globalState.lastLoginCheck).toLocaleTimeString()}`);
            return true;
        } finally {
            // 释放处理锁
            this._isProcessing = false;
        }
    }

    /**
     * 完成登录处理
     * @param {string} instanceId - 爬虫实例ID
     * @param {boolean} success - 是否成功
     */
    finishLoginProcess(instanceId, success) {
        // 确保实例被正确移除
        this._globalState.activeInstances.delete(instanceId);
        
        if (success) {
            // 登录成功，重置所有状态并设置登录冷却期
            this._globalState.isReopening = false;
            this._globalState.reopenCount = 0;
            this._globalState.lastReopenTime = 0;
            
            // 设置登录冷却期，防止立即重新检测
            this.setLoginCooldown(300000); // 5分钟冷却期
            
            console.log(`✅ 全局状态：实例 ${instanceId} 登录成功，重置全局状态并设置冷却期`);
            console.log(`🔄 全局状态：所有实例现在可以重新尝试登录`);
        } else {
            // 登录失败，保持重新打开状态但清理活跃实例
            console.log(`❌ 全局状态：实例 ${instanceId} 登录失败，保持重新打开状态`);
        }
        
        console.log(`📊 全局状态：当前活跃实例: ${this._globalState.activeInstances.size}`);
        
        // 如果所有实例都完成了，重置重新打开状态
        if (this._globalState.activeInstances.size === 0) {
            console.log(`🔄 全局状态：所有实例已完成，重置重新打开状态`);
            this._globalState.isReopening = false;
        }
    }

    /**
     * 设置登录冷却期
     * @param {number} duration - 冷却期持续时间（毫秒）
     */
    setLoginCooldown(duration) {
        this._globalState.loginCooldown = true;
        this._globalState.loginCooldownEnd = Date.now() + duration;
        console.log(`🕐 设置登录冷却期: ${duration / 1000}秒`);
    }
    
    /**
     * 清除登录冷却期
     */
    clearLoginCooldown() {
        this._globalState.loginCooldown = false;
        this._globalState.loginCooldownEnd = 0;
        console.log(`🕐 清除登录冷却期`);
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
            lastLoginCheck: this._globalState.lastLoginCheck,
            loginCooldown: this._globalState.loginCooldown,
            loginCooldownEnd: this._globalState.loginCooldownEnd
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
            lastLoginCheck: 0,
            loginCooldown: false,
            loginCooldownEnd: 0
        };
        this._logCache.clear();
        this._isProcessing = false;
        console.log('🔄 全局登录状态已重置');
    }

    /**
     * 重置重新打开计数（用于预登录成功后）
     */
    resetReopenCount() {
        this._globalState.reopenCount = 0;
        this._globalState.isReopening = false;
        console.log('🔄 重新打开计数已重置');
    }

    /**
     * 强制重置全局状态（用于解决死锁问题）
     */
    forceReset() {
        this._globalState = {
            isReopening: false,
            lastReopenTime: 0,
            reopenCount: 0,
            activeInstances: new Set(),
            lastLoginCheck: 0,
            loginCooldown: false,
            loginCooldownEnd: 0
        };
        this._logCache.clear();
        this._isProcessing = false;
        console.log('🔄 全局状态已强制重置（解决死锁）');
    }

    /**
     * 检查并清理僵尸实例（超过5分钟未完成的实例）
     */
    cleanupZombieInstances() {
        const now = Date.now();
        const timeout = 5 * 60 * 1000; // 5分钟超时
        
        if (this._globalState.isReopening && now - this._globalState.lastReopenTime > timeout) {
            console.log('🧹 检测到僵尸实例，强制清理全局状态');
            this.forceReset();
            return true;
        }
        
        return false;
    }
}

// 创建全局单例
const globalLoginManager = new GlobalLoginManager();

module.exports = globalLoginManager;
