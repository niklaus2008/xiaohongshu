#!/usr/bin/env node

/**
 * 测试简化后的登录系统
 * 验证前端不再创建登录窗口，只有后端负责登录
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

async function testSimplifiedLoginSystem() {
    console.log('🧪 开始测试简化后的登录系统...');
    console.log('💡 这个测试会验证前端不再创建登录窗口，只有后端负责登录');
    
    try {
        // 创建爬虫实例
        const scraper = new XiaohongshuScraper({
            downloadPath: './test-downloads',
            maxImages: 2,
            headless: false,
            login: {
                method: 'manual',
                autoLogin: true,
                saveCookies: true,
                cookieFile: './test-cookies.json'
            }
        });
        
        console.log('🔧 爬虫实例已创建');
        
        // 初始化浏览器
        console.log('\n📋 初始化浏览器...');
        await scraper.initBrowser();
        console.log('✅ 浏览器已初始化');
        
        // 测试1：检查初始状态
        console.log('\n📋 测试1：检查初始状态');
        console.log('_isWaitingForLogin:', scraper._isWaitingForLogin);
        console.log('isLoginWindowOpen:', scraper.isLoginWindowOpen);
        
        // 测试2：模拟后端自动登录
        console.log('\n📋 测试2：模拟后端自动登录');
        console.log('🔍 调用 autoLogin()...');
        
        const loginResult = await scraper.autoLogin();
        console.log('自动登录结果:', loginResult);
        console.log('_isWaitingForLogin:', scraper._isWaitingForLogin);
        console.log('isLoginWindowOpen:', scraper.isLoginWindowOpen);
        
        // 测试3：检查登录状态
        console.log('\n📋 测试3：检查登录状态');
        console.log('🔍 调用 getUnifiedLoginStatus()...');
        
        const loginStatus = await scraper.getUnifiedLoginStatus();
        console.log('登录状态:', loginStatus);
        
        // 测试4：等待一段时间后再次检查
        console.log('\n📋 测试4：等待5秒后再次检查');
        console.log('⏳ 等待5秒...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('🔍 再次检查登录状态...');
        const loginStatus2 = await scraper.getUnifiedLoginStatus();
        console.log('第二次登录状态:', loginStatus2);
        console.log('_isWaitingForLogin:', scraper._isWaitingForLogin);
        console.log('isLoginWindowOpen:', scraper.isLoginWindowOpen);
        
        console.log('\n🎉 测试完成！');
        console.log('💡 如果简化成功，应该只会看到一个登录窗口（由后端创建）');
        console.log('💡 前端不再创建登录窗口，只显示状态信息');
        
        // 关闭爬虫
        await scraper.close();
        console.log('🔧 爬虫已关闭');
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
        console.error('错误堆栈:', error.stack);
    }
}

// 运行测试
if (require.main === module) {
    testSimplifiedLoginSystem().catch(console.error);
}

module.exports = { testSimplifiedLoginSystem };
