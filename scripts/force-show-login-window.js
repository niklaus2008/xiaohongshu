#!/usr/bin/env node

/**
 * 强制显示登录窗口工具
 * 确保用户能看到小红书登录页面
 */

const { chromium } = require('playwright');

async function forceShowLoginWindow() {
    console.log('🔧 正在创建强制显示的浏览器窗口...');
    console.log('💡 这个工具会强制显示浏览器窗口，确保您能看到小红书登录页面');
    
    try {
        // 创建浏览器实例，强制显示
        const browser = await chromium.launch({
            headless: false, // 强制显示
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--window-size=1200,800', // 设置窗口大小
                '--window-position=100,100', // 设置窗口位置
                '--start-maximized', // 启动时最大化
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--force-device-scale-factor=1',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ]
        });
        
        console.log('✅ 浏览器已启动');
        
        // 创建新页面
        const page = await browser.newPage();
        
        // 设置视口大小
        await page.setViewportSize({ width: 1200, height: 800 });
        
        console.log('🌐 正在打开小红书登录页面...');
        
        // 打开小红书登录页面
        await page.goto('https://www.xiaohongshu.com/explore', {
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
        
        // 等待页面完全加载
        await page.waitForTimeout(3000);
        
        // 查找并点击登录按钮
        console.log('🔍 正在查找登录按钮...');
        
        try {
            // 等待登录按钮出现
            await page.waitForSelector('text=登录', { timeout: 10000 });
            console.log('✅ 找到登录按钮');
            
            // 点击登录按钮
            await page.click('text=登录');
            console.log('✅ 已点击登录按钮');
            
            // 等待登录界面加载
            await page.waitForTimeout(2000);
            
            console.log('\n🎉 登录窗口已成功显示！');
            console.log('📱 请使用小红书APP或微信扫描页面上的二维码完成登录');
            console.log('\n💡 如果仍然看不到窗口，请尝试以下方法：');
            console.log('   1. 按 Alt+Tab (Windows) 或 Cmd+Tab (Mac) 切换窗口');
            console.log('   2. 检查任务栏或Dock中的浏览器图标');
            console.log('   3. 查看是否有新的浏览器窗口被打开');
            console.log('   4. 检查是否有浏览器窗口在后台运行');
            console.log('   5. 尝试按 F11 全屏显示');
            console.log('   6. 检查是否有浏览器窗口被最小化');
            
        } catch (error) {
            console.log('⚠️ 无法找到登录按钮，但页面已打开');
            console.log('💡 请手动查找登录按钮并点击');
        }
        
        // 保持窗口打开，等待用户操作
        console.log('\n⏳ 窗口将保持打开状态，请完成登录...');
        console.log('💡 完成登录后，请按 Ctrl+C 关闭此程序');
        
        // 监听页面关闭事件
        page.on('close', () => {
            console.log('🔒 登录窗口已关闭');
        });
        
        // 保持程序运行
        process.on('SIGINT', async () => {
            console.log('\n🛑 正在关闭浏览器...');
            await browser.close();
            console.log('✅ 浏览器已关闭');
            process.exit(0);
        });
        
        // 定期检查页面状态
        setInterval(async () => {
            try {
                const url = page.url();
                console.log(`📍 当前页面: ${url}`);
            } catch (error) {
                console.log('⚠️ 页面可能已关闭');
            }
        }, 30000); // 每30秒检查一次
        
    } catch (error) {
        console.error('❌ 创建强制显示窗口失败:', error.message);
        console.log('💡 请检查系统权限和网络连接');
    }
}

// 运行强制显示登录窗口
forceShowLoginWindow();
