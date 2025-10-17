/**
 * 测试多个登录窗口修复效果
 * 模拟多个爬虫实例同时检测登录状态的情况
 */

const globalLoginManager = require('./src/global-login-manager');

async function testMultipleLoginInstances() {
    console.log('🧪 开始测试多个登录窗口修复效果...\n');
    
    // 模拟多个爬虫实例
    const instances = [
        'scraper_001',
        'scraper_002', 
        'scraper_003'
    ];
    
    console.log('📊 初始全局状态:', globalLoginManager.getGlobalState());
    
    // 测试1：第一个实例尝试开始登录处理
    console.log('\n🔍 测试1：第一个实例尝试开始登录处理');
    const result1 = globalLoginManager.startLoginProcess(instances[0]);
    console.log(`实例 ${instances[0]} 开始登录处理: ${result1}`);
    console.log('📊 当前全局状态:', globalLoginManager.getGlobalState());
    
    // 测试2：第二个实例尝试开始登录处理（应该被拒绝）
    console.log('\n🔍 测试2：第二个实例尝试开始登录处理（应该被拒绝）');
    const result2 = globalLoginManager.startLoginProcess(instances[1]);
    console.log(`实例 ${instances[1]} 开始登录处理: ${result2}`);
    console.log('📊 当前全局状态:', globalLoginManager.getGlobalState());
    
    // 测试3：第三个实例尝试开始登录处理（应该被拒绝）
    console.log('\n🔍 测试3：第三个实例尝试开始登录处理（应该被拒绝）');
    const result3 = globalLoginManager.startLoginProcess(instances[2]);
    console.log(`实例 ${instances[2]} 开始登录处理: ${result3}`);
    console.log('📊 当前全局状态:', globalLoginManager.getGlobalState());
    
    // 测试4：第一个实例完成登录处理（成功）
    console.log('\n🔍 测试4：第一个实例完成登录处理（成功）');
    globalLoginManager.finishLoginProcess(instances[0], true);
    console.log('📊 当前全局状态:', globalLoginManager.getGlobalState());
    
    // 测试5：第二个实例现在可以开始登录处理
    console.log('\n🔍 测试5：第二个实例现在可以开始登录处理');
    const result4 = globalLoginManager.startLoginProcess(instances[1]);
    console.log(`实例 ${instances[1]} 开始登录处理: ${result4}`);
    console.log('📊 当前全局状态:', globalLoginManager.getGlobalState());
    
    // 测试6：测试频繁检查限制
    console.log('\n🔍 测试6：测试频繁检查限制');
    const result5 = globalLoginManager.startLoginProcess(instances[2]);
    console.log(`实例 ${instances[2]} 立即尝试开始登录处理: ${result5}`);
    
    // 等待一段时间后再次尝试
    console.log('⏳ 等待11秒后再次尝试...');
    await new Promise(resolve => setTimeout(resolve, 11000));
    
    const result6 = globalLoginManager.startLoginProcess(instances[2]);
    console.log(`实例 ${instances[2]} 等待后尝试开始登录处理: ${result6}`);
    console.log('📊 当前全局状态:', globalLoginManager.getGlobalState());
    
    // 测试7：测试僵尸实例清理
    console.log('\n🔍 测试7：测试僵尸实例清理');
    globalLoginManager.finishLoginProcess(instances[1], false);
    
    // 模拟僵尸实例（设置一个很久以前的时间）
    globalLoginManager._globalState.lastReopenTime = Date.now() - 6 * 60 * 1000; // 6分钟前
    globalLoginManager._globalState.isReopening = true;
    
    console.log('📊 设置僵尸实例后的状态:', globalLoginManager.getGlobalState());
    
    const cleanupResult = globalLoginManager.cleanupZombieInstances();
    console.log(`僵尸实例清理结果: ${cleanupResult}`);
    console.log('📊 清理后的状态:', globalLoginManager.getGlobalState());
    
    // 测试8：测试强制重置
    console.log('\n🔍 测试8：测试强制重置');
    globalLoginManager.startLoginProcess(instances[0]);
    console.log('📊 强制重置前的状态:', globalLoginManager.getGlobalState());
    
    globalLoginManager.forceReset();
    console.log('📊 强制重置后的状态:', globalLoginManager.getGlobalState());
    
    console.log('\n✅ 测试完成！');
    console.log('💡 如果看到多个实例被正确拒绝，说明修复生效');
    console.log('💡 如果看到僵尸实例被清理，说明清理机制工作正常');
}

// 运行测试
testMultipleLoginInstances().catch(console.error);
