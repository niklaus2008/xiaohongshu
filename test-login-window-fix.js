/**
 * 测试登录窗口重复弹出问题修复
 * 验证修复后只会出现一个登录窗口
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

async function testLoginWindowFix() {
    console.log('🧪 开始测试登录窗口重复弹出问题修复...');
    
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
        console.log('📋 测试场景：模拟用户扫码登录流程');
        console.log('🎯 预期结果：只会出现一个登录窗口，不会重复弹出');
        
        // 测试1：检查初始状态
        console.log('\n🔍 测试1：检查初始状态');
        console.log('isLoginWindowOpen:', scraper.isLoginWindowOpen);
        console.log('_isWaitingForLogin:', scraper._isWaitingForLogin);
        
        // 测试2：模拟登录状态检测
        console.log('\n🔍 测试2：模拟登录状态检测');
        console.log('调用 checkLoginStatus...');
        
        // 这里会触发登录窗口打开
        const loginStatus = await scraper.checkLoginStatus();
        console.log('登录状态检查结果:', loginStatus);
        
        // 测试3：检查等待标志是否正确设置
        console.log('\n🔍 测试3：检查等待标志设置');
        console.log('isLoginWindowOpen:', scraper.isLoginWindowOpen);
        console.log('_isWaitingForLogin:', scraper._isWaitingForLogin);
        
        // 测试4：模拟5秒后的重复检测
        console.log('\n🔍 测试4：模拟5秒后的重复检测');
        console.log('等待5秒...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('再次调用 checkLoginStatus...');
        const loginStatus2 = await scraper.checkLoginStatus();
        console.log('第二次登录状态检查结果:', loginStatus2);
        
        // 测试5：检查是否仍然只有一个登录窗口
        console.log('\n🔍 测试5：检查登录窗口状态');
        console.log('isLoginWindowOpen:', scraper.isLoginWindowOpen);
        console.log('_isWaitingForLogin:', scraper._isWaitingForLogin);
        
        console.log('\n✅ 测试完成！');
        console.log('💡 如果修复成功，应该只会出现一个登录窗口');
        console.log('💡 如果仍有问题，请检查日志中的重复检查逻辑');
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
    } finally {
        // 清理资源
        if (scraper.browser) {
            await scraper.close();
        }
    }
}

// 运行测试
if (require.main === module) {
    testLoginWindowFix().catch(console.error);
}

module.exports = { testLoginWindowFix };