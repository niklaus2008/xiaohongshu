/**
 * 测试日志源
 */

// 模拟Logger类的行为
class TestLogger {
    constructor() {
        this.logs = [];
        this.originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn
        };
        this.overrideConsole();
    }
    
    overrideConsole() {
        const self = this;
        
        console.log = function(...args) {
            self.log('info', args);
        };
        
        console.error = function(...args) {
            self.log('error', args);
        };
        
        console.warn = function(...args) {
            self.log('warning', args);
        };
    }
    
    log(level, args) {
        const message = args.join(' ');
        const timestamp = new Date().toISOString();
        
        // 输出到终端
        this.originalConsole.log(`[${level.toUpperCase()}] ${message}`);
        
        // 记录日志
        this.logs.push({
            timestamp,
            level,
            message
        });
        
        console.log(`日志已记录: ${message}`); // 这会导致递归！
    }
    
    getLogs() {
        return this.logs;
    }
    
    restore() {
        console.log = this.originalConsole.log;
        console.error = this.originalConsole.error;
        console.warn = this.originalConsole.warn;
    }
}

// 测试
const logger = new TestLogger();

console.log('测试日志1');
console.log('测试日志2');
console.log('测试日志3');

setTimeout(() => {
    console.log('延迟日志');
    
    setTimeout(() => {
        logger.restore();
        console.log('恢复后的日志');
        console.log('日志总数:', logger.getLogs().length);
        process.exit(0);
    }, 1000);
}, 1000);
