#!/usr/bin/env node

/**
 * 调试浏览器窗口创建问题
 * 检查批量处理流程中的浏览器窗口创建代码
 */

const { chromium } = require('playwright');

async function debugBrowserCreation() {
    console.log('🔧 正在调试浏览器窗口创建问题...');
    console.log('💡 这个工具会检查浏览器窗口创建过程，确保窗口真的被创建了');
    
    try {
        // 1. 检查浏览器启动参数
        console.log('🔍 正在检查浏览器启动参数...');
        
        const browserArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--start-maximized',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ];
        
        console.log('✅ 浏览器启动参数已设置');
        console.log('📋 启动参数:', browserArgs.join(' '));
        
        // 2. 创建浏览器实例
        console.log('🚀 正在创建浏览器实例...');
        
        const browser = await chromium.launch({
            headless: false, // 明确设置为显示模式
            args: browserArgs
        });
        
        console.log('✅ 浏览器实例已创建（显示模式）');
        
        // 3. 检查浏览器实例状态
        console.log('🔍 正在检查浏览器实例状态...');
        
        if (browser) {
            console.log('✅ 浏览器实例存在');
            console.log('📊 浏览器实例类型:', typeof browser);
            console.log('📊 浏览器实例构造函数:', browser.constructor.name);
        } else {
            console.log('❌ 浏览器实例不存在');
            return;
        }
        
        // 4. 创建新页面
        console.log('🆕 正在创建新页面...');
        
        const page = await browser.newPage();
        console.log('✅ 新页面已创建');
        
        // 5. 检查页面状态
        console.log('🔍 正在检查页面状态...');
        
        if (page) {
            console.log('✅ 页面实例存在');
            console.log('📊 页面实例类型:', typeof page);
            console.log('📊 页面实例构造函数:', page.constructor.name);
        } else {
            console.log('❌ 页面实例不存在');
            return;
        }
        
        // 6. 设置视口大小
        console.log('📐 正在设置视口大小...');
        
        await page.setViewportSize({ width: 1200, height: 800 });
        console.log('✅ 视口大小已设置');
        
        // 7. 打开小红书登录页面
        console.log('🌐 正在打开小红书登录页面...');
        
        await page.goto('https://www.xiaohongshu.com/explore', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        
        console.log('✅ 页面已加载');
        
        // 8. 强制将窗口置于前台
        console.log('👁️ 正在将窗口置于前台...');
        
        await page.bringToFront();
        console.log('✅ 窗口已置于前台');
        
        // 9. 尝试最大化窗口
        console.log('🖥️ 正在尝试最大化窗口...');
        
        try {
            await page.evaluate(() => {
                if (window.screen && window.screen.availWidth && window.screen.availHeight) {
                    window.resizeTo(window.screen.availWidth, window.screen.availHeight);
                    window.moveTo(0, 0);
                }
            });
            console.log('✅ 窗口已最大化');
        } catch (error) {
            console.log('⚠️ 无法最大化窗口，但继续执行');
        }
        
        // 10. 等待页面完全加载
        console.log('⏳ 正在等待页面完全加载...');
        
        await page.waitForTimeout(3000);
        console.log('✅ 页面加载完成');
        
        // 11. 查找并点击登录按钮
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
            
            console.log('\n🎉 小红书登录窗口已成功创建！');
            console.log('📱 请使用小红书APP或微信扫描页面上的二维码完成登录');
            
        } catch (error) {
            console.log('⚠️ 无法找到登录按钮，但页面已打开');
            console.log('💡 请手动查找登录按钮并点击');
        }
        
        // 12. 提供详细的窗口查找指导
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
        
        // 13. 保持窗口打开，等待用户操作
        console.log('\n⏳ 窗口将保持打开状态，请完成登录...');
        console.log('💡 完成登录后，请按 Ctrl+C 关闭此程序');
        
        // 14. 监听页面关闭事件
        page.on('close', () => {
            console.log('🔒 登录窗口已关闭');
        });
        
        // 15. 保持程序运行
        process.on('SIGINT', async () => {
            console.log('\n🛑 正在关闭浏览器...');
            await browser.close();
            console.log('✅ 浏览器已关闭');
            process.exit(0);
        });
        
        // 16. 定期检查页面状态
        setInterval(async () => {
            try {
                const url = page.url();
                console.log(`📍 当前页面: ${url}`);
            } catch (error) {
                console.log('⚠️ 页面可能已关闭');
            }
        }, 30000); // 每30秒检查一次
        
    } catch (error) {
        console.error('❌ 调试浏览器窗口创建问题失败:', error.message);
        console.log('💡 请检查系统权限和网络连接');
        console.log('📋 错误详情:', error.stack);
    }
}

// 运行调试浏览器窗口创建问题
debugBrowserCreation();
