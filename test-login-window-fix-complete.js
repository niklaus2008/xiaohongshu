#!/usr/bin/env node

/**
 * 完整测试登录窗口修复
 * 验证修复后只会弹出一个登录窗口
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

async function testLoginWindowFix() {
    console.log('🧪 开始完整测试登录窗口修复...');
    console.log('💡 这个测试会验证修复后只会弹出一个登录窗口');
    
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
        
        // 测试1：检查_isWaitingForLogin标志的初始状态
        console.log('\n📋 测试1：检查_isWaitingForLogin标志的初始状态');
        console.log('_isWaitingForLogin:', scraper._isWaitingForLogin);
        console.log('✅ 初始状态应该是 undefined 或 false');
        
        // 测试2：模拟登录状态检测
        console.log('\n📋 测试2：模拟登录状态检测');
        console.log('🔍 正在检查登录状态...');
        
        // 这会触发登录状态检测，可能会调用openLoginWindowInUserBrowser
        const loginStatus = await scraper.getUnifiedLoginStatus();
        console.log('登录状态:', loginStatus);
        
        // 检查等待标志是否被正确设置
        console.log('_isWaitingForLogin:', scraper._isWaitingForLogin);
        
        if (scraper._isWaitingForLogin) {
            console.log('✅ 等待标志已设置，应该只有一个登录窗口');
        } else {
            console.log('ℹ️ 等待标志未设置，可能不需要登录');
        }
        
        // 测试3：模拟多次登录状态检测
        console.log('\n📋 测试3：模拟多次登录状态检测');
        console.log('🔍 进行第二次登录状态检测...');
        
        const loginStatus2 = await scraper.getUnifiedLoginStatus();
        console.log('第二次登录状态:', loginStatus2);
        console.log('_isWaitingForLogin:', scraper._isWaitingForLogin);
        
        // 测试4：等待一段时间后再次检测
        console.log('\n📋 测试4：等待5秒后再次检测');
        console.log('⏳ 等待5秒...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('🔍 进行第三次登录状态检测...');
        const loginStatus3 = await scraper.getUnifiedLoginStatus();
        console.log('第三次登录状态:', loginStatus3);
        console.log('_isWaitingForLogin:', scraper._isWaitingForLogin);
        
        console.log('\n🎉 测试完成！');
        console.log('💡 如果修复成功，应该只会看到一个登录窗口');
        console.log('💡 如果仍然看到多个登录窗口，说明修复不完整');
        
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
    testLoginWindowFix().catch(console.error);
}

module.exports = { testLoginWindowFix };
