/**
 * 登录窗口持久性测试脚本
 * 验证登录框不会自动消失，只有一个登录窗口
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

/**
 * 测试登录窗口持久性
 */
async function testLoginWindowPersistence() {
    console.log('🧪 开始测试登录窗口持久性...');
    console.log('📊 验证登录框不会自动消失，只有一个登录窗口');
    
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
        
        // 测试浏览器初始化
        console.log('\n🌐 测试浏览器初始化...');
        await scraper.initBrowser();
        console.log('✅ 浏览器初始化成功');
        
        // 测试事件驱动登录状态
        console.log('\n📊 测试事件驱动登录状态...');
        const initialStatus = scraper.getEventDrivenLoginStatus();
        console.log('初始事件驱动登录状态:', initialStatus);
        
        // 第一次调用自动登录
        console.log('\n🔐 第一次调用自动登录...');
        console.log('📝 观察：应该创建登录窗口，登录框应该保持显示');
        const loginResult1 = await scraper.autoLogin();
        console.log('第一次登录结果:', loginResult1);
        
        // 等待5秒，观察登录框是否消失
        console.log('\n⏰ 等待5秒，观察登录框是否消失...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 第二次调用自动登录（应该被阻止）
        console.log('\n🔐 第二次调用自动登录（应该被防重复机制阻止）...');
        console.log('📝 观察：不应该创建新的登录窗口');
        const loginResult2 = await scraper.autoLogin();
        console.log('第二次登录结果:', loginResult2);
        
        // 检查事件驱动登录状态
        console.log('\n📊 检查事件驱动登录状态...');
        const currentStatus = scraper.getEventDrivenLoginStatus();
        console.log('当前事件驱动登录状态:', currentStatus);
        
        // 等待10秒，观察登录框是否仍然存在
        console.log('\n⏰ 等待10秒，观察登录框是否仍然存在...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // 第三次调用自动登录（应该被阻止）
        console.log('\n🔐 第三次调用自动登录（应该被防重复机制阻止）...');
        console.log('📝 观察：不应该创建新的登录窗口');
        const loginResult3 = await scraper.autoLogin();
        console.log('第三次登录结果:', loginResult3);
        
        // 最终检查事件驱动登录状态
        console.log('\n📊 最终检查事件驱动登录状态...');
        const finalStatus = scraper.getEventDrivenLoginStatus();
        console.log('最终事件驱动登录状态:', finalStatus);
        
        // 清理资源
        console.log('\n🧹 清理资源...');
        await scraper.close();
        console.log('✅ 资源清理完成');
        
        console.log('\n🎉 登录窗口持久性测试完成！');
        console.log('📝 测试结果分析：');
        console.log('  1. 第一次调用应该创建登录窗口');
        console.log('  2. 登录框应该保持显示，不会自动消失');
        console.log('  3. 后续调用应该被防重复机制阻止');
        console.log('  4. 应该只有一个登录窗口存在');
        
    } catch (error) {
        console.error('❌ 测试过程中出错:', error.message);
        console.error('错误堆栈:', error.stack);
    }
}

/**
 * 测试重复登录调用
 */
async function testDuplicateLoginCalls() {
    console.log('\n🔄 测试重复登录调用...');
    
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
        
        // 同时调用多个登录方法，观察防重复机制
        console.log('🚀 同时调用多个登录方法...');
        console.log('📝 观察：应该只有一个登录窗口，其他调用应该被阻止');
        
        const promises = [
            scraper.autoLogin(),
            scraper.autoLogin(),
            scraper.autoLogin()
        ];
        
        console.log('📊 观察防重复机制是否生效...');
        const results = await Promise.allSettled(promises);
        
        console.log('📋 结果分析:');
        results.forEach((result, index) => {
            console.log(`  调用 ${index + 1}:`, result.status, result.value || result.reason);
        });
        
        // 检查事件驱动登录状态
        const status = scraper.getEventDrivenLoginStatus();
        console.log('📊 最终事件驱动登录状态:', status);
        
        await scraper.close();
        
    } catch (error) {
        console.error('❌ 重复调用测试出错:', error.message);
    }
}

/**
 * 主测试函数
 */
async function main() {
    console.log('🚀 开始登录窗口持久性完整测试...\n');
    
    // 测试登录窗口持久性
    await testLoginWindowPersistence();
    
    // 测试重复登录调用
    await testDuplicateLoginCalls();
    
    console.log('\n✅ 所有测试完成！');
    console.log('📝 请仔细检查测试结果，特别关注：');
    console.log('  1. 登录框是否保持显示，不会自动消失');
    console.log('  2. 是否只有一个登录窗口存在');
    console.log('  3. 防重复机制是否正确工作');
    console.log('  4. 事件驱动登录管理器状态是否正确');
}

// 运行测试
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    testLoginWindowPersistence,
    testDuplicateLoginCalls
};
