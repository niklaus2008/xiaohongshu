/**
 * 检查异步操作和日志输出
 */

// 检查是否有持续的日志输出
let logCount = 0;
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = function(...args) {
    logCount++;
    originalLog(`[LOG ${logCount}]`, ...args);
};

console.error = function(...args) {
    logCount++;
    originalError(`[ERROR ${logCount}]`, ...args);
};

console.warn = function(...args) {
    logCount++;
    originalWarn(`[WARN ${logCount}]`, ...args);
};

// 监控5秒内的日志输出
setTimeout(() => {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    
    console.log(`\n监控结果:`);
    console.log(`5秒内共输出 ${logCount} 条日志`);
    
    if (logCount > 0) {
        console.log('⚠️ 检测到持续的日志输出，这可能是前端日志不停止的原因');
    } else {
        console.log('✅ 没有检测到持续的日志输出');
    }
    
    process.exit(0);
}, 5000);

console.log('开始监控日志输出...');
