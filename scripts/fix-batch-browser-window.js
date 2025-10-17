#!/usr/bin/env node

/**
 * 修复批量处理流程中的浏览器窗口显示问题
 * 确保用户能看到小红书登录页面
 */

const { chromium } = require('playwright');

async function fixBatchBrowserWindow() {
    console.log('🔧 正在修复批量处理流程中的浏览器窗口显示问题...');
    console.log('💡 这个工具会强制显示浏览器窗口，确保您能看到小红书登录页面');
    
    try {
        // 1. 先关闭所有现有的浏览器实例
        console.log('🔄 正在关闭所有现有的浏览器实例...');
        
        try {
            // 在macOS上查找并关闭Chromium进程
            const { exec } = require('child_process');
            exec('pkill -f "chromium"', (error, stdout, stderr) => {
                if (error) {
                    console.log('⚠️ 无法关闭现有浏览器实例，但继续执行');
                } else {
                    console.log('✅ 已关闭现有浏览器实例');
                }
            });
            
            // 等待一下让进程完全关闭
            await new Promise(resolve => setTimeout(resolve, 3000));
            
        } catch (error) {
            console.log('⚠️ 关闭现有浏览器实例时出现错误，但继续执行');
        }
        
        // 2. 创建全新的浏览器实例
        console.log('🚀 正在创建全新的浏览器实例...');
        
        const browser = await chromium.launch({
            headless: false, // 明确设置为显示模式
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--window-size=1200,800',
                '--window-position=200,200',
                '--start-maximized',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--force-device-scale-factor=1',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-default-apps',
                '--disable-sync',
                '--disable-translate',
                '--disable-background-networking',
                '--disable-client-side-phishing-detection',
                '--disable-component-extensions-with-background-pages',
                '--disable-features=TranslateUI',
                '--disable-ipc-flooding-protection',
                '--disable-popup-blocking',
                '--disable-prompt-on-repost',
                '--disable-web-resources',
                '--enable-automation',
                '--force-color-profile=srgb',
                '--metrics-recording-only',
                '--safebrowsing-disable-auto-update',
                '--password-store=basic',
                '--use-mock-keychain',
                '--disable-blink-features=AutomationControlled',
                '--new-window',
                '--force-new-window',
                '--always-on-top',
                '--disable-background-mode',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-features=TranslateUI',
                '--disable-ipc-flooding-protection',
                '--disable-popup-blocking',
                '--disable-prompt-on-repost',
                '--disable-web-resources',
                '--enable-automation',
                '--force-color-profile=srgb',
                '--metrics-recording-only',
                '--safebrowsing-disable-auto-update',
                '--password-store=basic',
                '--use-mock-keychain',
                '--disable-blink-features=AutomationControlled'
            ]
        });
        
        console.log('✅ 浏览器实例已创建（显示模式）');
        
        // 3. 创建新页面
        const page = await browser.newPage();
        console.log('✅ 新页面已创建');
        
        // 4. 设置视口大小
        await page.setViewportSize({ width: 1200, height: 800 });
        console.log('✅ 视口大小已设置');
        
        // 5. 打开小红书登录页面
        console.log('🌐 正在打开小红书登录页面...');
        await page.goto('https://www.xiaohongshu.com/explore', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        
        console.log('✅ 页面已加载');
        
        // 6. 强制将窗口置于前台
        await page.bringToFront();
        console.log('👁️ 窗口已置于前台');
        
        // 7. 尝试最大化窗口
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
        
        // 8. 等待页面完全加载
        await page.waitForTimeout(3000);
        
        // 9. 查找并点击登录按钮
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
            
            console.log('\n🎉 小红书登录窗口已成功显示！');
            console.log('📱 请使用小红书APP或微信扫描页面上的二维码完成登录');
            
        } catch (error) {
            console.log('⚠️ 无法找到登录按钮，但页面已打开');
            console.log('💡 请手动查找登录按钮并点击');
        }
        
        // 10. 提供详细的窗口查找指导
        console.log('\n💡 如果仍然看不到窗口，请尝试以下方法：');
        console.log('   1. 按 Cmd+Tab (Mac) 或 Alt+Tab (Windows) 切换窗口');
        console.log('   2. 检查Dock或任务栏中的浏览器图标');
        console.log('   3. 查看是否有新的浏览器窗口被打开');
        console.log('   4. 检查是否有浏览器窗口在后台运行');
        console.log('   5. 尝试按 F11 全屏显示');
        console.log('   6. 检查是否有浏览器窗口被最小化');
        console.log('   7. 尝试按 Cmd+M (Mac) 或 Alt+Space (Windows) 显示窗口菜单');
        console.log('   8. 检查是否有浏览器窗口在另一个桌面空间');
        console.log('   9. 尝试按 Cmd+Shift+Tab (Mac) 反向切换窗口');
        console.log('   10. 检查系统偏好设置中的窗口管理设置');
        
        // 11. 保持窗口打开，等待用户操作
        console.log('\n⏳ 窗口将保持打开状态，请完成登录...');
        console.log('💡 完成登录后，请按 Ctrl+C 关闭此程序');
        
        // 12. 监听页面关闭事件
        page.on('close', () => {
            console.log('🔒 登录窗口已关闭');
        });
        
        // 13. 保持程序运行
        process.on('SIGINT', async () => {
            console.log('\n🛑 正在关闭浏览器...');
            await browser.close();
            console.log('✅ 浏览器已关闭');
            process.exit(0);
        });
        
        // 14. 定期检查页面状态
        setInterval(async () => {
            try {
                const url = page.url();
                console.log(`📍 当前页面: ${url}`);
            } catch (error) {
                console.log('⚠️ 页面可能已关闭');
            }
        }, 30000); // 每30秒检查一次
        
    } catch (error) {
        console.error('❌ 修复批量处理流程中的浏览器窗口显示问题失败:', error.message);
        console.log('💡 请检查系统权限和网络连接');
    }
}

// 运行修复批量处理流程中的浏览器窗口显示问题
fixBatchBrowserWindow();
