/**
 * 详细日志测试脚本
 * 验证登录框持久性和防重复机制
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

/**
 * 测试详细日志功能
 */
async function testDetailedLogging() {
    console.log('🧪 开始测试详细日志功能...');
    console.log('📊 这将帮助诊断登录框消失和重复登录窗口的问题');
    
    try {
        // 创建爬虫实例
        const scraper = new XiaohongshuScraper({
            downloadPath: './test-downloads',
            maxImages: 5,
            headless: false,
            login: {
                method: 'manual',
                autoLogin: true,
                saveCookies: true,
                cookieFile: './test-cookies.json'
            }
        });
        
        console.log('✅ 爬虫实例创建成功');
        
        // 测试事件驱动登录状态
        console.log('\n📊 测试事件驱动登录状态...');
        const loginStatus = scraper.getEventDrivenLoginStatus();
        console.log('事件驱动登录状态:', loginStatus);
        
        // 测试浏览器初始化
        console.log('\n🌐 测试浏览器初始化...');
        await scraper.initBrowser();
        console.log('✅ 浏览器初始化成功');
        
        // 测试事件驱动自动登录（这里会触发详细的日志）
        console.log('\n🔐 测试事件驱动自动登录（观察详细日志）...');
        console.log('📝 注意观察以下关键日志：');
        console.log('  - 🔍 [登录等待循环] 事件驱动登录管理器状态');
        console.log('  - 🔍 [页面状态检查] 当前页面URL');
        console.log('  - 🔍 [登录成功检测] 检查当前页面URL');
        console.log('  - 🛡️ 防刷新保护：登录页面将保持显示');
        console.log('  - 📱 登录框应该保持显示，不会消失');
        
        const loginResult = await scraper.autoLogin();
        console.log('登录结果:', loginResult);
        
        // 等待10秒，观察登录框是否消失
        console.log('\n⏰ 等待10秒，观察登录框是否消失...');
        console.log('📝 观察：登录框应该保持显示，不会消失');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // 再次检查事件驱动登录状态
        console.log('\n📊 登录后的事件驱动状态...');
        const finalStatus = scraper.getEventDrivenLoginStatus();
        console.log('最终事件驱动登录状态:', finalStatus);
        
        // 清理资源
        console.log('\n🧹 清理资源...');
        await scraper.close();
        console.log('✅ 资源清理完成');
        
        console.log('\n🎉 详细日志测试完成！');
        console.log('📝 请检查上述日志输出，特别关注：');
        console.log('  1. 登录框是否保持显示，不会消失');
        console.log('  2. 页面状态检查是否正常');
        console.log('  3. 防刷新机制是否生效');
        console.log('  4. 事件驱动登录管理器状态是否正确');
        
    } catch (error) {
        console.error('❌ 测试过程中出错:', error.message);
        console.error('错误堆栈:', error.stack);
    }
}

/**
 * 测试心跳检测对登录的影响
 */
async function testHeartbeatImpact() {
    console.log('\n💓 测试心跳检测对登录的影响...');
    
    try {
        const scraper = new XiaohongshuScraper({
            downloadPath: './test-downloads',
            maxImages: 5,
            headless: false,
            login: {
                method: 'manual',
                autoLogin: true,
                saveCookies: true,
                cookieFile: './test-cookies.json'
            }
        });
        
        await scraper.initBrowser();
        
        // 启动登录流程
        console.log('🚀 启动登录流程...');
        const loginPromise = scraper.autoLogin();
        
        // 等待一段时间，观察心跳检测是否影响登录
        console.log('⏰ 等待30秒，观察心跳检测是否影响登录...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // 检查登录状态
        const status = scraper.getEventDrivenLoginStatus();
        console.log('📊 心跳检测后的登录状态:', status);
        
        await scraper.close();
        
    } catch (error) {
        console.error('❌ 心跳检测测试出错:', error.message);
    }
}

/**
 * 主测试函数
 */
async function main() {
    console.log('🚀 开始详细日志功能完整测试...\n');
    
    // 测试详细日志功能
    await testDetailedLogging();
    
    // 测试心跳检测对登录的影响
    await testHeartbeatImpact();
    
    console.log('\n✅ 所有测试完成！');
    console.log('📝 请仔细检查日志输出，特别关注：');
    console.log('  - 登录框是否保持显示，不会消失');
    console.log('  - 页面状态检查是否正常');
    console.log('  - 防刷新机制是否生效');
    console.log('  - 心跳检测是否影响登录过程');
    console.log('  - 事件驱动登录管理器状态是否正确');
}

// 运行测试
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    testDetailedLogging,
    testHeartbeatImpact
};
