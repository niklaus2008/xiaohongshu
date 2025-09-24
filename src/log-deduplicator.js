
/**
 * 日志去重工具
 * 防止重复的日志输出
 */
class LogDeduplicator {
    constructor() {
        this.logCache = new Map();
        this.cacheTimeout = 30000; // 30秒缓存
    }

    /**
     * 去重日志输出
     * @param {string} message - 日志消息
     * @param {string} level - 日志级别
     * @param {number} timeout - 缓存超时时间（毫秒）
     */
    log(message, level = 'info', timeout = 30000) {
        const key = `${message}_${level}`;
        const now = Date.now();
        
        // 检查缓存
        if (this.logCache.has(key)) {
            const cached = this.logCache.get(key);
            if (now - cached.timestamp < timeout) {
                return; // 跳过重复日志
            }
        }
        
        // 输出日志并缓存
        console.log(`[${level.toUpperCase()}] ${message}`);
        this.logCache.set(key, { timestamp: now });
        
        // 清理过期缓存
        this.cleanExpiredCache();
    }

    /**
     * 清理过期缓存
     */
    cleanExpiredCache() {
        const now = Date.now();
        for (const [key, value] of this.logCache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.logCache.delete(key);
            }
        }
    }

    /**
     * 清空所有缓存
     */
    clear() {
        this.logCache.clear();
    }
}

module.exports = LogDeduplicator;
