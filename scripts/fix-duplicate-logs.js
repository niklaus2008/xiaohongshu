/**
 * 修复重复日志问题的脚本
 * 主要解决登录状态检测和心跳检测导致的重复日志问题
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const fs = require('fs-extra');
const path = require('path');

class DuplicateLogsFixer {
    constructor() {
        this.fixes = [];
    }

    /**
     * 修复登录状态检测的重复日志问题
     */
    async fixLoginStatusLogs() {
        console.log('🔧 修复登录状态检测重复日志问题...');
        
        const scraperFile = path.join(__dirname, 'src/xiaohongshu-scraper.js');
        let content = await fs.readFile(scraperFile, 'utf8');
        
        // 添加防重复机制
        const duplicatePrevention = `
    // 防重复日志机制
    if (this._lastLoginAttempt && Date.now() - this._lastLoginAttempt < 30000) {
        console.log('⏳ 登录尝试过于频繁，跳过本次检测...');
        return { success: false, error: '登录尝试过于频繁' };
    }
    this._lastLoginAttempt = Date.now();
`;
        
        // 在 autoReopenLoginPage 方法开始处添加防重复机制
        content = content.replace(
            /async autoReopenLoginPage\(\) \{\s*try\s*\{/,
            `async autoReopenLoginPage() {
        try {
            ${duplicatePrevention}`
        );
        
        await fs.writeFile(scraperFile, content);
        this.fixes.push('✅ 已添加登录状态检测防重复机制');
    }

    /**
     * 修复心跳检测的重复日志问题
     */
    async fixHeartbeatLogs() {
        console.log('🔧 修复心跳检测重复日志问题...');
        
        const webInterfaceFile = path.join(__dirname, 'src/web-interface.js');
        let content = await fs.readFile(webInterfaceFile, 'utf8');
        
        // 修改心跳检测逻辑，减少重复日志
        const newHeartbeatLogic = `
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
    }`;
        
        // 替换原有的 startHeartbeat 方法
        content = content.replace(
            /startHeartbeat\(\) \{[^}]+\}/s,
            newHeartbeatLogic
        );
        
        await fs.writeFile(webInterfaceFile, content);
        this.fixes.push('✅ 已优化心跳检测逻辑，减少重复日志');
    }

    /**
     * 修复浏览器实例管理的重复日志问题
     */
    async fixBrowserManagementLogs() {
        console.log('🔧 修复浏览器实例管理重复日志问题...');
        
        const scraperFile = path.join(__dirname, 'src/xiaohongshu-scraper.js');
        let content = await fs.readFile(scraperFile, 'utf8');
        
        // 添加浏览器操作防重复机制
        const browserOperationPrevention = `
    // 浏览器操作防重复机制
    if (this._lastBrowserOperation && Date.now() - this._lastBrowserOperation < 5000) {
        console.log('⏳ 浏览器操作过于频繁，跳过本次操作...');
        return;
    }
    this._lastBrowserOperation = Date.now();
`;
        
        // 在关键浏览器操作方法中添加防重复机制
        const methodsToFix = [
            'bringToFront',
            'maximizeWindow',
            'triggerLoginInterface'
        ];
        
        for (const method of methodsToFix) {
            const methodRegex = new RegExp(`(async ${method}\\(\\) \\{[^}]*try\\s*\\{)`, 'g');
            content = content.replace(methodRegex, `$1\n            ${browserOperationPrevention}`);
        }
        
        await fs.writeFile(scraperFile, content);
        this.fixes.push('✅ 已添加浏览器操作防重复机制');
    }

    /**
     * 创建日志去重工具
     */
    async createLogDeduplicator() {
        console.log('🔧 创建日志去重工具...');
        
        const deduplicatorContent = `
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
        const key = \`\${message}_\${level}\`;
        const now = Date.now();
        
        // 检查缓存
        if (this.logCache.has(key)) {
            const cached = this.logCache.get(key);
            if (now - cached.timestamp < timeout) {
                return; // 跳过重复日志
            }
        }
        
        // 输出日志并缓存
        console.log(\`[\${level.toUpperCase()}] \${message}\`);
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
`;
        
        await fs.writeFile(path.join(__dirname, 'src/log-deduplicator.js'), deduplicatorContent);
        this.fixes.push('✅ 已创建日志去重工具');
    }

    /**
     * 应用所有修复
     */
    async applyAllFixes() {
        console.log('🚀 开始应用重复日志修复...\n');
        
        try {
            await this.fixLoginStatusLogs();
            await this.fixHeartbeatLogs();
            await this.fixBrowserManagementLogs();
            await this.createLogDeduplicator();
            
            console.log('\n🎉 所有修复已应用完成！');
            console.log('\n📋 修复内容总结：');
            this.fixes.forEach(fix => console.log(fix));
            
            console.log('\n💡 建议：');
            console.log('1. 重启服务以应用修复');
            console.log('2. 监控日志输出，确认重复问题已解决');
            console.log('3. 如果仍有问题，可以进一步调整防重复的时间间隔');
            
        } catch (error) {
            console.error('❌ 修复过程中发生错误:', error.message);
            throw error;
        }
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const fixer = new DuplicateLogsFixer();
    fixer.applyAllFixes().catch(console.error);
}

module.exports = DuplicateLogsFixer;
