/**
 * 测试登录状态一致性和实例协调机制
 * 验证只有一个实例处理登录，且能正确检测登录状态
 */

const globalLoginManager = require('./src/global-login-manager');

async function testLoginConsistency() {
    console.log('🧪 开始测试登录状态一致性和实例协调机制...\n');
    
    // 测试1：基本互斥机制
    console.log('🔍 测试1：基本互斥机制');
    const instances = ['scraper_001', 'scraper_002', 'scraper_003'];
    
    // 第一个实例开始处理
    const result1 = globalLoginManager.startLoginProcess(instances[0]);
    console.log(`✅ 实例 ${instances[0]} 开始处理: ${result1}`);
    
    // 其他实例应该被拒绝
    const result2 = globalLoginManager.startLoginProcess(instances[1]);
    const result3 = globalLoginManager.startLoginProcess(instances[2]);
    console.log(`❌ 实例 ${instances[1]} 被拒绝: ${result2}`);
    console.log(`❌ 实例 ${instances[2]} 被拒绝: ${result3}`);
    
    console.log('📊 当前全局状态:', globalLoginManager.getGlobalState());
    
    // 测试2：完成处理后的状态清理
    console.log('\n🔍 测试2：完成处理后的状态清理');
    globalLoginManager.finishLoginProcess(instances[0], true);
    console.log('📊 完成处理后的状态:', globalLoginManager.getGlobalState());
    
    // 现在其他实例应该可以开始处理
    const result4 = globalLoginManager.startLoginProcess(instances[1]);
    console.log(`✅ 实例 ${instances[1]} 现在可以开始处理: ${result4}`);
    
    // 测试3：频繁检查限制
    console.log('\n🔍 测试3：频繁检查限制');
    globalLoginManager.finishLoginProcess(instances[1], false);
    
    // 立即尝试开始处理（应该被拒绝）
    const result5 = globalLoginManager.startLoginProcess(instances[2]);
    console.log(`❌ 实例 ${instances[2]} 立即尝试被拒绝: ${result5}`);
    
    // 等待一段时间后再次尝试
    console.log('⏳ 等待11秒后再次尝试...');
    await new Promise(resolve => setTimeout(resolve, 11000));
    
    const result6 = globalLoginManager.startLoginProcess(instances[2]);
    console.log(`✅ 实例 ${instances[2]} 等待后可以开始处理: ${result6}`);
    
    // 测试4：僵尸实例清理
    console.log('\n🔍 测试4：僵尸实例清理');
    globalLoginManager.finishLoginProcess(instances[2], false);
    
    // 模拟僵尸实例
    globalLoginManager._globalState.lastReopenTime = Date.now() - 6 * 60 * 1000; // 6分钟前
    globalLoginManager._globalState.isReopening = true;
    globalLoginManager._globalState.activeInstances.add('zombie_instance');
    
    console.log('📊 设置僵尸实例后的状态:', globalLoginManager.getGlobalState());
    
    const cleanupResult = globalLoginManager.cleanupZombieInstances();
    console.log(`🧹 僵尸实例清理结果: ${cleanupResult}`);
    console.log('📊 清理后的状态:', globalLoginManager.getGlobalState());
    
    // 测试5：强制重置
    console.log('\n🔍 测试5：强制重置');
    globalLoginManager.startLoginProcess(instances[0]);
    console.log('📊 强制重置前的状态:', globalLoginManager.getGlobalState());
    
    globalLoginManager.forceReset();
    console.log('📊 强制重置后的状态:', globalLoginManager.getGlobalState());
    
    // 测试6：并发测试
    console.log('\n🔍 测试6：并发测试');
    const concurrentInstances = ['concurrent_001', 'concurrent_002', 'concurrent_003', 'concurrent_004', 'concurrent_005'];
    
    const promises = concurrentInstances.map(async (instanceId, index) => {
        // 模拟不同时间启动
        await new Promise(resolve => setTimeout(resolve, index * 100));
        const result = globalLoginManager.startLoginProcess(instanceId);
        console.log(`实例 ${instanceId} 尝试开始处理: ${result}`);
        return { instanceId, result };
    });
    
    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.result).length;
    const failCount = results.filter(r => !r.result).length;
    
    console.log(`📊 并发测试结果: 成功 ${successCount}, 失败 ${failCount}`);
    console.log('📊 最终全局状态:', globalLoginManager.getGlobalState());
    
    // 清理
    globalLoginManager.forceReset();
    
    console.log('\n✅ 所有测试完成！');
    console.log('💡 如果看到只有一个实例成功，其他被拒绝，说明互斥机制工作正常');
    console.log('💡 如果看到僵尸实例被清理，说明清理机制工作正常');
    console.log('💡 如果看到并发测试中只有一个成功，说明竞态条件被正确处理');
}

// 运行测试
testLoginConsistency().catch(console.error);
