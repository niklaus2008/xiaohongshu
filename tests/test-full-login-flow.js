#!/usr/bin/env node

/**
 * 测试完整登录流程
 * 模拟真实的登录过程，验证修复效果
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

async function testFullLoginFlow() {
    console.log('🧪 开始测试完整登录流程...');
    console.log('💡 这个测试会模拟真实的登录过程');
    
    try {
        // 创建一个爬虫实例
        const scraper = new XiaohongshuScraper({
            headless: false, // 强制显示浏览器
            browserType: 'chromium',
            login: {
                method: 'manual',
                autoLogin: true,
                saveCookies: true,
                cookieFile: './test-cookies.json'
            }
        });
        
        console.log('🔧 正在初始化浏览器...');
        await scraper.initBrowser();
        
        console.log('🌐 正在打开小红书页面...');
        await scraper.page.goto('https://www.xiaohongshu.com/explore', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        
        // 确保页面可见
        await scraper.page.bringToFront();
        console.log('👁️ 已将页面置于前台');
        
        // 尝试最大化窗口
        try {
            await scraper.page.evaluate(() => {
                if (window.screen && window.screen.availWidth && window.screen.availHeight) {
                    window.resizeTo(window.screen.availWidth, window.screen.availHeight);
                    window.moveTo(0, 0);
                }
            });
            console.log('🖥️ 已尝试最大化窗口');
        } catch (error) {
            console.log('⚠️ 无法最大化窗口，但继续执行');
        }
        
        console.log('\n🎯 现在开始模拟登录流程...');
        
        // 检查登录状态
        console.log('🔍 检查当前登录状态...');
        const loginStatus = await scraper.checkLoginStatus();
        console.log(`📊 登录状态评分: ${loginStatus.loginScore}`);
        
        if (loginStatus.loginScore <= 0) {
            console.log('🔄 登录状态评分过低，开始自动重新打开登录页面...');
            
            // 模拟自动重新打开登录页面
            const reopenResult = await scraper.autoReopenLoginPage();
            if (reopenResult.success) {
                console.log('✅ 登录页面重新打开成功');
                console.log('📱 请使用小红书APP或微信扫描页面上的二维码完成登录...');
                
                console.log('\n⚠️ 重要提示：');
                console.log('   1. 请勿关闭浏览器窗口，否则登录会失败');
                console.log('   2. 请勿按 Ctrl+C 中断程序，否则浏览器会被关闭');
                console.log('   3. 完成扫码登录后，程序会自动检测登录状态');
                console.log('   4. 如果浏览器窗口被遮挡，请使用 Cmd+Tab 切换窗口');
                
                console.log('\n⏳ 等待30秒让您完成登录...');
                console.log('💡 在这30秒内，请完成扫码登录');
                
                // 等待用户完成登录
                for (let i = 30; i > 0; i--) {
                    process.stdout.write(`\r⏰ 剩余时间: ${i}秒 `);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                console.log('\n🔍 检查登录状态...');
                const finalStatus = await scraper.checkLoginStatus();
                console.log(`📊 最终登录状态评分: ${finalStatus.loginScore}`);
                
                if (finalStatus.loginScore > 0) {
                    console.log('✅ 登录成功！');
                } else {
                    console.log('❌ 登录失败，可能需要更多时间');
                }
                
            } else {
                console.log('❌ 登录页面重新打开失败:', reopenResult.error);
            }
        } else {
            console.log('✅ 已经登录，无需重新登录');
        }
        
        console.log('\n🔒 正在关闭浏览器...');
        await scraper.close();
        console.log('✅ 浏览器已关闭');
        
        console.log('\n📋 测试完成！');
        console.log('💡 如果您能看到浏览器窗口并完成登录流程，说明修复完全成功！');
        
    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error.message);
        console.log('💡 请检查网络连接和系统权限');
    }
}

// 运行测试
testFullLoginFlow();
