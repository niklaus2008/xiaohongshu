#!/usr/bin/env node

/**
 * 查找隐藏窗口工具
 * 帮助用户找到被隐藏的浏览器窗口
 */

const { exec } = require('child_process');
const { chromium } = require('playwright');

async function findHiddenWindows() {
    console.log('🔍 正在查找隐藏的浏览器窗口...');
    
    try {
        // 在macOS上查找Chrome/Chromium进程
        console.log('🔍 正在查找Chrome/Chromium进程...');
        
        exec('ps aux | grep -i chrome | grep -v grep', (error, stdout, stderr) => {
            if (stdout) {
                console.log('✅ 找到Chrome/Chromium进程:');
                console.log(stdout);
            } else {
                console.log('❌ 未找到Chrome/Chromium进程');
            }
        });
        
        // 等待一下
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 创建新的浏览器实例
        console.log('\n🔧 正在创建新的浏览器实例...');
        
        const browser = await chromium.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--window-size=1000,700',
                '--window-position=300,300',
                '--start-maximized'
            ]
        });
        
        console.log('✅ 浏览器已启动');
        
        // 创建新页面
        const page = await browser.newPage();
        
        // 设置视口大小
        await page.setViewportSize({ width: 1000, height: 700 });
        
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
            
        } catch (error) {
            console.log('⚠️ 无法找到登录按钮，但页面已打开');
            console.log('💡 请手动查找登录按钮并点击');
        }
        
        // 提供详细的窗口查找指导
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
        console.error('❌ 查找隐藏窗口失败:', error.message);
        console.log('💡 请检查系统权限和网络连接');
    }
}

// 运行查找隐藏窗口
findHiddenWindows();
