/**
 * 检查当前运行的所有定时器
 */

// 检查当前进程的定时器
console.log('当前进程的定时器信息:');
console.log('setTimeout 调用次数:', process._getActiveHandles().filter(h => h.constructor.name === 'Timeout').length);
console.log('setInterval 调用次数:', process._getActiveHandles().filter(h => h.constructor.name === 'Interval').length);

// 检查所有活跃的句柄
const handles = process._getActiveHandles();
console.log('\n所有活跃句柄:');
handles.forEach((handle, index) => {
    console.log(`${index + 1}. ${handle.constructor.name}:`, handle);
});

// 检查所有活跃的请求
const requests = process._getActiveRequests();
console.log('\n所有活跃请求:');
requests.forEach((request, index) => {
    console.log(`${index + 1}. ${request.constructor.name}:`, request);
});

console.log('\n进程信息:');
console.log('PID:', process.pid);
console.log('内存使用:', process.memoryUsage());
console.log('运行时间:', process.uptime(), '秒');
