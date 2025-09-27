/**
 * 增强日志测试脚本
 * 验证事件驱动登录管理器的详细日志输出
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

/**
 * 测试增强日志功能
 */
async function testEnhancedLogging() {
    console.log('🧪 开始测试增强日志功能...');
    console.log('📊 这将帮助诊断登录框闪退后出现新登录窗口的问题');
    
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
        console.log('📝 注意观察以下日志：');
        console.log('  - [事件驱动登录管理器] 开头的日志');
        console.log('  - [autoLogin] 开头的日志');
        console.log('  - [checkLoginStatus] 开头的日志');
        console.log('  - [autoRefreshCookies] 开头的日志');
        console.log('  - 🎯 [事件驱动] 开头的事件日志');
        
        const loginResult = await scraper.autoLogin();
        console.log('登录结果:', loginResult);
        
        // 再次检查事件驱动登录状态
        console.log('\n📊 登录后的事件驱动状态...');
        const finalStatus = scraper.getEventDrivenLoginStatus();
        console.log('最终事件驱动登录状态:', finalStatus);
        
        // 清理资源
        console.log('\n🧹 清理资源...');
        await scraper.close();
        console.log('✅ 资源清理完成');
        
        console.log('\n🎉 增强日志测试完成！');
        console.log('📝 请检查上述日志输出，特别关注：');
        console.log('  1. 事件驱动登录管理器的状态变化');
        console.log('  2. 防重复机制的触发情况');
        console.log('  3. 登录窗口的打开和关闭过程');
        console.log('  4. 状态同步情况');
        
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
        
        await scraper.close();
        
    } catch (error) {
        console.error('❌ 重复调用测试出错:', error.message);
    }
}

/**
 * 主测试函数
 */
async function main() {
    console.log('🚀 开始增强日志功能完整测试...\n');
    
    // 测试增强日志功能
    await testEnhancedLogging();
    
    // 测试重复登录调用
    await testDuplicateLoginCalls();
    
    console.log('\n✅ 所有测试完成！');
    console.log('📝 请仔细检查日志输出，特别关注：');
    console.log('  - 事件驱动登录管理器的状态管理');
    console.log('  - 防重复机制的触发和效果');
    console.log('  - 登录窗口的生命周期管理');
    console.log('  - 状态同步的准确性');
}

// 运行测试
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    testEnhancedLogging,
    testDuplicateLoginCalls
};