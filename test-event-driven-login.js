/**
 * 事件驱动登录系统测试脚本
 * 验证事件驱动异步登录+状态管理功能
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

/**
 * 测试事件驱动登录系统
 */
async function testEventDrivenLogin() {
    console.log('🧪 开始测试事件驱动登录系统...');
    
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
        
        // 测试事件驱动自动登录
        console.log('\n🔐 测试事件驱动自动登录...');
        const loginResult = await scraper.autoLogin();
        console.log('登录结果:', loginResult);
        
        // 再次检查事件驱动登录状态
        console.log('\n📊 登录后的事件驱动状态...');
        const finalStatus = scraper.getEventDrivenLoginStatus();
        console.log('最终事件驱动登录状态:', finalStatus);
        
        // 测试登录状态检查
        console.log('\n🔍 测试登录状态检查...');
        const unifiedStatus = await scraper.getUnifiedLoginStatus();
        console.log('统一登录状态:', unifiedStatus);
        
        // 清理资源
        console.log('\n🧹 清理资源...');
        await scraper.close();
        console.log('✅ 资源清理完成');
        
        console.log('\n🎉 事件驱动登录系统测试完成！');
        
    } catch (error) {
        console.error('❌ 测试过程中出错:', error.message);
        console.error('错误堆栈:', error.stack);
    }
}

/**
 * 测试事件驱动登录管理器的事件监听
 */
async function testEventDrivenListeners() {
    console.log('\n🎧 测试事件驱动登录监听器...');
    
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
        
        // 添加额外的事件监听器来测试事件系统
        scraper.eventDrivenLoginManager.on('loginStarted', (data) => {
            console.log('🎯 监听到登录开始事件:', data);
        });
        
        scraper.eventDrivenLoginManager.on('loginSuccess', (result) => {
            console.log('🎯 监听到登录成功事件:', result);
        });
        
        scraper.eventDrivenLoginManager.on('loginFailed', (error) => {
            console.log('🎯 监听到登录失败事件:', error.message);
        });
        
        scraper.eventDrivenLoginManager.on('stateChanged', (data) => {
            console.log('🎯 监听到状态变化事件:', data.changes);
        });
        
        console.log('✅ 事件监听器设置完成');
        
        // 测试状态变化
        console.log('\n📊 测试状态变化...');
        scraper.eventDrivenLoginManager.updateState({ 
            isWaitingForLogin: true 
        });
        
        // 等待一下让事件触发
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('✅ 事件监听器测试完成');
        
    } catch (error) {
        console.error('❌ 事件监听器测试出错:', error.message);
    }
}

/**
 * 主测试函数
 */
async function main() {
    console.log('🚀 开始事件驱动登录系统完整测试...\n');
    
    // 测试事件监听器
    await testEventDrivenListeners();
    
    // 测试完整登录流程
    await testEventDrivenLogin();
    
    console.log('\n✅ 所有测试完成！');
}

// 运行测试
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    testEventDrivenLogin,
    testEventDrivenListeners
};
