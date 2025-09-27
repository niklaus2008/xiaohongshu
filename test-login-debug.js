/**
 * 登录框重复弹出问题调试测试
 * 添加详细日志，方便定位问题
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

async function testLoginDebug() {
    console.log('🔍 开始登录框重复弹出问题调试测试...');
    console.log('📋 测试目标：验证修复后只会出现一个登录窗口');
    console.log('📊 日志级别：详细调试信息');
    
    const scraper = new XiaohongshuScraper({
        downloadPath: './test-downloads',
        maxImages: 3,
        headless: false,
        login: {
            method: 'manual',
            autoLogin: true,
            saveCookies: true,
            cookieFile: './test-cookies.json'
        }
    });
    
    try {
        console.log('\n=== 测试阶段1：初始状态检查 ===');
        console.log('📊 初始状态 - isLoginWindowOpen:', scraper.isLoginWindowOpen);
        console.log('📊 初始状态 - _isWaitingForLogin:', scraper._isWaitingForLogin);
        
        console.log('\n=== 测试阶段2：第一次登录状态检测 ===');
        console.log('🔍 调用 checkLoginStatus() 方法...');
        const startTime1 = Date.now();
        const loginStatus1 = await scraper.checkLoginStatus();
        const endTime1 = Date.now();
        
        console.log('📋 第一次检测结果:', loginStatus1);
        console.log('⏱️ 第一次检测耗时:', (endTime1 - startTime1), 'ms');
        console.log('📊 第一次检测后状态 - isLoginWindowOpen:', scraper.isLoginWindowOpen, '_isWaitingForLogin:', scraper._isWaitingForLogin);
        
        console.log('\n=== 测试阶段3：等待5秒后重复检测 ===');
        console.log('⏳ 等待5秒，模拟用户扫码时间...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('🔍 再次调用 checkLoginStatus() 方法...');
        const startTime2 = Date.now();
        const loginStatus2 = await scraper.checkLoginStatus();
        const endTime2 = Date.now();
        
        console.log('📋 第二次检测结果:', loginStatus2);
        console.log('⏱️ 第二次检测耗时:', (endTime2 - startTime2), 'ms');
        console.log('📊 第二次检测后状态 - isLoginWindowOpen:', scraper.isLoginWindowOpen, '_isWaitingForLogin:', scraper._isWaitingForLogin);
        
        console.log('\n=== 测试阶段4：等待10秒后第三次检测 ===');
        console.log('⏳ 等待10秒，模拟更长的等待时间...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        console.log('🔍 第三次调用 checkLoginStatus() 方法...');
        const startTime3 = Date.now();
        const loginStatus3 = await scraper.checkLoginStatus();
        const endTime3 = Date.now();
        
        console.log('📋 第三次检测结果:', loginStatus3);
        console.log('⏱️ 第三次检测耗时:', (endTime3 - startTime3), 'ms');
        console.log('📊 第三次检测后状态 - isLoginWindowOpen:', scraper.isLoginWindowOpen, '_isWaitingForLogin:', scraper._isWaitingForLogin);
        
        console.log('\n=== 测试结果分析 ===');
        console.log('🎯 关键指标检查：');
        console.log('  - 是否只出现一个登录窗口？', scraper.isLoginWindowOpen ? '❌ 是' : '✅ 否');
        console.log('  - 等待标志是否正确设置？', scraper._isWaitingForLogin ? '✅ 是' : '❌ 否');
        console.log('  - 是否有重复调用 openLoginWindowInUserBrowser？', '需要查看日志');
        
        console.log('\n📊 状态变化时间线：');
        console.log('  T0: 初始状态 - isLoginWindowOpen:', false, '_isWaitingForLogin:', false);
        console.log('  T1: 第一次检测后 - isLoginWindowOpen:', scraper.isLoginWindowOpen, '_isWaitingForLogin:', scraper._isWaitingForLogin);
        console.log('  T2: 第二次检测后 - isLoginWindowOpen:', scraper.isLoginWindowOpen, '_isWaitingForLogin:', scraper._isWaitingForLogin);
        console.log('  T3: 第三次检测后 - isLoginWindowOpen:', scraper.isLoginWindowOpen, '_isWaitingForLogin:', scraper._isWaitingForLogin);
        
        console.log('\n✅ 调试测试完成！');
        console.log('💡 如果修复成功，应该看到：');
        console.log('  - 只有第一次检测会创建登录窗口');
        console.log('  - 后续检测会跳过创建登录窗口');
        console.log('  - 等待标志在登录过程中保持为true');
        console.log('  - 没有重复调用 openLoginWindowInUserBrowser');
        
    } catch (error) {
        console.error('❌ 调试测试过程中发生错误:', error.message);
        console.error('📊 错误发生时的状态 - isLoginWindowOpen:', scraper.isLoginWindowOpen, '_isWaitingForLogin:', scraper._isWaitingForLogin);
    } finally {
        console.log('\n🧹 清理资源...');
        if (scraper.browser) {
            await scraper.close();
            console.log('✅ 浏览器已关闭');
        }
        console.log('📊 最终状态 - isLoginWindowOpen:', scraper.isLoginWindowOpen, '_isWaitingForLogin:', scraper._isWaitingForLogin);
    }
}

// 运行调试测试
if (require.main === module) {
    testLoginDebug().catch(console.error);
}

module.exports = { testLoginDebug };
