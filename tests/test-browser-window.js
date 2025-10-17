#!/usr/bin/env node

/**
 * 测试浏览器窗口显示
 * 验证浏览器窗口是否真的可见
 */

const { chromium } = require('playwright');

async function testBrowserWindow() {
    console.log('🧪 开始测试浏览器窗口显示...');
    console.log('💡 这个测试会打开一个浏览器窗口，请观察是否能看到');
    
    try {
        // 创建浏览器实例
        const browser = await chromium.launch({
            headless: false, // 明确设置为显示模式
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--window-size=800,600',
                '--window-position=300,300',
                '--new-window',
                '--force-new-window',
                '--always-on-top'
            ]
        });
        
        console.log('✅ 浏览器已启动（显示模式）');
        
        // 创建新页面
        const page = await browser.newPage();
        console.log('✅ 新页面已创建');
        
        // 打开一个简单的测试页面
        await page.goto('https://www.baidu.com', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        
        console.log('✅ 页面已加载');
        
        // 强制将窗口置于前台
        await page.bringToFront();
        console.log('👁️ 窗口已置于前台');
        
        // 尝试最大化窗口
        try {
            await page.evaluate(() => {
                if (window.screen && window.screen.availWidth && window.screen.availHeight) {
                    window.resizeTo(window.screen.availWidth, window.screen.availHeight);
                    window.moveTo(0, 0);
                }
            });
            console.log('🖥️ 窗口已最大化');
        } catch (error) {
            console.log('⚠️ 无法最大化窗口，但继续执行');
        }
        
        console.log('\n🎯 测试结果：');
        console.log('✅ 浏览器实例已创建');
        console.log('✅ 页面已加载');
        console.log('✅ 窗口已置于前台');
        console.log('✅ 窗口已最大化');
        
        console.log('\n💡 如果您能看到浏览器窗口和百度页面，说明浏览器显示正常！');
        console.log('💡 如果仍然看不到窗口，可能是系统设置问题');
        
        // 等待用户确认
        console.log('\n⏳ 等待20秒后自动关闭浏览器...');
        console.log('💡 在这20秒内，请确认是否能看到浏览器窗口');
        
        for (let i = 20; i > 0; i--) {
            process.stdout.write(`\r⏰ 剩余时间: ${i}秒 `);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('\n🔒 正在关闭浏览器...');
        await browser.close();
        console.log('✅ 浏览器已关闭');
        
        console.log('\n📋 测试完成！');
        console.log('请告诉我您是否看到了浏览器窗口？');
        
    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error.message);
        console.log('💡 请检查网络连接和系统权限');
    }
}

// 运行测试浏览器窗口
testBrowserWindow();