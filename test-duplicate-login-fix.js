/**
 * 测试重复登录窗口问题修复
 * 验证修复后只会出现一个登录窗口
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

async function testDuplicateLoginFix() {
    console.log('🔍 开始测试重复登录窗口问题修复...');
    console.log('📋 测试目标：验证修复后只会出现一个登录窗口');
    console.log('🎯 关键检查：autoLogin和checkLoginStatus的协调机制');
    
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
        console.log('\n=== 测试阶段1：模拟autoLogin调用 ===');
        console.log('📊 初始状态 - isLoginWindowOpen:', scraper.isLoginWindowOpen, '_isWaitingForLogin:', scraper._isWaitingForLogin);
        
        // 模拟autoLogin调用
        console.log('🚀 调用 autoLogin() 方法...');
        const startTime1 = Date.now();
        const autoLoginResult = await scraper.autoLogin();
        const endTime1 = Date.now();
        
        console.log('📋 autoLogin结果:', autoLoginResult);
        console.log('⏱️ autoLogin耗时:', (endTime1 - startTime1), 'ms');
        console.log('📊 autoLogin后状态 - isLoginWindowOpen:', scraper.isLoginWindowOpen, '_isWaitingForLogin:', scraper._isWaitingForLogin);
        
        console.log('\n=== 测试阶段2：模拟checkLoginStatus调用 ===');
        console.log('⏳ 等待2秒，模拟用户扫码时间...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('🔍 调用 checkLoginStatus() 方法...');
        const startTime2 = Date.now();
        const checkResult = await scraper.checkLoginStatus();
        const endTime2 = Date.now();
        
        console.log('📋 checkLoginStatus结果:', checkResult);
        console.log('⏱️ checkLoginStatus耗时:', (endTime2 - startTime2), 'ms');
        console.log('📊 checkLoginStatus后状态 - isLoginWindowOpen:', scraper.isLoginWindowOpen, '_isWaitingForLogin:', scraper._isWaitingForLogin);
        
        console.log('\n=== 测试阶段3：模拟多次checkLoginStatus调用 ===');
        for (let i = 1; i <= 3; i++) {
            console.log(`\n--- 第${i}次checkLoginStatus调用 ---`);
            console.log('⏳ 等待3秒...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            console.log(`🔍 第${i}次调用 checkLoginStatus() 方法...`);
            const startTime = Date.now();
            const result = await scraper.checkLoginStatus();
            const endTime = Date.now();
            
            console.log(`📋 第${i}次checkLoginStatus结果:`, result);
            console.log(`⏱️ 第${i}次checkLoginStatus耗时:`, (endTime - startTime), 'ms');
            console.log(`📊 第${i}次后状态 - isLoginWindowOpen:`, scraper.isLoginWindowOpen, '_isWaitingForLogin:', scraper._isWaitingForLogin);
        }
        
        console.log('\n=== 测试结果分析 ===');
        console.log('🎯 关键指标检查：');
        console.log('  - autoLogin是否创建了登录窗口？', scraper.isLoginWindowOpen ? '✅ 是' : '❌ 否');
        console.log('  - 等待标志是否正确设置？', scraper._isWaitingForLogin ? '✅ 是' : '❌ 否');
        console.log('  - checkLoginStatus是否跳过了重复创建？', '需要查看日志');
        
        console.log('\n📊 状态变化时间线：');
        console.log('  T0: 初始状态 - isLoginWindowOpen:', false, '_isWaitingForLogin:', false);
        console.log('  T1: autoLogin后 - isLoginWindowOpen:', scraper.isLoginWindowOpen, '_isWaitingForLogin:', scraper._isWaitingForLogin);
        console.log('  T2: checkLoginStatus后 - isLoginWindowOpen:', scraper.isLoginWindowOpen, '_isWaitingForLogin:', scraper._isWaitingForLogin);
        
        console.log('\n✅ 重复登录窗口测试完成！');
        console.log('💡 如果修复成功，应该看到：');
        console.log('  - autoLogin创建第一个登录窗口');
        console.log('  - checkLoginStatus检测到已有登录窗口，跳过重复创建');
        console.log('  - 日志中显示"检测到已有登录窗口正在等待，跳过重复创建"');
        console.log('  - 只有一个登录窗口，不会出现第二个');
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
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

// 运行测试
if (require.main === module) {
    testDuplicateLoginFix().catch(console.error);
}

module.exports = { testDuplicateLoginFix };
