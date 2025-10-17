/**
 * 增强版Cookie管理器
 * 提供更智能的Cookie验证和自动续期功能
 */

const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

class EnhancedCookieManager {
    constructor(options = {}) {
        this.cookieFile = options.cookieFile || './cookies.json';
        this.backupFile = options.backupFile || './cookies-backup.json';
        this.browser = null;
        this.page = null;
        this.context = null;
    }

    /**
     * 智能Cookie管理
     */
    async manageCookies() {
        try {
            console.log('🍪 开始智能Cookie管理...\n');
            
            // 1. 检查Cookie文件
            const cookieExists = await fs.pathExists(this.cookieFile);
            
            if (!cookieExists) {
                console.log('📝 首次使用，需要登录');
                return await this.firstTimeLogin();
            }
            
            // 2. 加载并验证Cookie
            const cookies = await fs.readJson(this.cookieFile);
            console.log(`📦 加载了 ${cookies.length} 个Cookie`);
            
            // 3. 验证Cookie有效性
            const validation = await this.validateCookies(cookies);
            
            if (validation.isValid) {
                console.log('✅ Cookie有效，无需重新登录');
                return { success: true, cookies: cookies };
            } else {
                console.log(`⚠️ Cookie验证失败: ${validation.reason}`);
                
                // 尝试使用备份Cookie
                if (await fs.pathExists(this.backupFile)) {
                    console.log('🔄 尝试使用备份Cookie...');
                    const backupCookies = await fs.readJson(this.backupFile);
                    const backupValidation = await this.validateCookies(backupCookies);
                    
                    if (backupValidation.isValid) {
                        console.log('✅ 备份Cookie有效，恢复使用');
                        await fs.writeJson(this.cookieFile, backupCookies, { spaces: 2 });
                        return { success: true, cookies: backupCookies };
                    }
                }
                
                // 需要重新登录
                return await this.refreshLogin();
            }
            
        } catch (error) {
            console.error('❌ Cookie管理失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 启动用户当前浏览器
     */
    async launchUserBrowser() {
        try {
            // 尝试连接到用户当前浏览器
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            // 检测操作系统并打开浏览器
            const platform = process.platform;
            let command;
            
            if (platform === 'darwin') {
                // macOS
                command = 'open -a "Google Chrome" --args --remote-debugging-port=9222';
            } else if (platform === 'win32') {
                // Windows
                command = 'start chrome --remote-debugging-port=9222';
            } else {
                // Linux
                command = 'google-chrome --remote-debugging-port=9222';
            }
            
            console.log('🌐 正在启动用户浏览器...');
            await execAsync(command);
            
            // 等待浏览器启动
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 连接到已存在的浏览器
            const browser = await chromium.connectOverCDP('http://localhost:9222');
            return browser;
            
        } catch (error) {
            console.log('⚠️ 无法连接到用户浏览器，使用默认浏览器');
            // 如果无法连接到用户浏览器，回退到默认浏览器
            return await chromium.launch({
                headless: false,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });
        }
    }

    /**
     * 验证Cookie有效性
     */
    async validateCookies(cookies) {
        try {
            console.log('🔍 验证Cookie有效性...');
            
            // 尝试连接到用户当前浏览器
            this.browser = await this.launchUserBrowser();
            
            this.context = await this.browser.newContext();
            this.page = await this.context.newPage();
            
            // 加载Cookie
            await this.context.addCookies(cookies);
            
            // 访问需要登录的页面
            await this.page.goto('https://www.xiaohongshu.com/explore', { 
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            await this.page.waitForTimeout(5000);
            
            // 检查登录状态
            const loginStatus = await this.checkLoginStatus();
            
            if (loginStatus.isLoggedIn) {
                console.log('✅ Cookie验证成功');
                return { isValid: true, reason: 'Cookie有效' };
            } else {
                console.log('❌ Cookie验证失败');
                return { isValid: false, reason: loginStatus.reason };
            }
            
        } catch (error) {
            console.error('❌ Cookie验证过程中出错:', error.message);
            return { isValid: false, reason: error.message };
        }
    }

    /**
     * 检查登录状态
     */
    async checkLoginStatus() {
        try {
            const pageInfo = await this.page.evaluate(() => {
                const bodyText = document.body ? document.body.innerText : '';
                return {
                    url: window.location.href,
                    title: document.title,
                    hasLoginPrompt: bodyText.includes('登录后查看搜索结果') || 
                                   bodyText.includes('扫码登录') || 
                                   bodyText.includes('手机号登录') ||
                                   bodyText.includes('请先登录'),
                    hasUserElements: document.querySelectorAll('.avatar, .user-avatar, .profile-avatar, .user-name, .username').length > 0,
                    hasContent: document.querySelectorAll('.note-item, .feed-item, .content-item').length > 0,
                    hasNavigation: document.querySelectorAll('.nav, .navigation, .menu').length > 0
                };
            });
            
            // 检查明确的未登录提示
            if (pageInfo.hasLoginPrompt) {
                return { isLoggedIn: false, reason: '页面显示登录提示' };
            }
            
            // 检查用户相关元素
            if (pageInfo.hasUserElements) {
                return { isLoggedIn: true, reason: '检测到用户元素' };
            }
            
            // 检查内容
            if (pageInfo.hasContent > 0) {
                return { isLoggedIn: true, reason: '检测到内容' };
            }
            
            // 检查导航
            if (pageInfo.hasNavigation > 0) {
                return { isLoggedIn: true, reason: '检测到导航元素' };
            }
            
            return { isLoggedIn: false, reason: '未检测到登录状态' };
            
        } catch (error) {
            console.error('❌ 检查登录状态时出错:', error.message);
            return { isLoggedIn: false, reason: error.message };
        }
    }

    /**
     * 首次登录
     */
    async firstTimeLogin() {
        try {
            console.log('🔐 开始首次登录...');
            
            if (!this.browser) {
                this.browser = await this.launchUserBrowser();
            }
            
            this.context = await this.browser.newContext();
            this.page = await this.context.newPage();
            
            // 访问小红书首页
            await this.page.goto('https://www.xiaohongshu.com/explore', { 
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            
            console.log('💡 请在浏览器中完成登录（支持扫码登录）...');
            console.log('⏳ 程序将自动检测登录状态...');
            
            // 等待登录完成
            const loginSuccess = await this.waitForLogin();
            
            if (loginSuccess) {
                // 保存Cookie
                await this.saveCookies();
                console.log('✅ 首次登录成功，Cookie已保存');
                return { success: true, cookies: await this.context.cookies() };
            } else {
                console.log('❌ 首次登录失败');
                return { success: false, error: '登录超时' };
            }
            
        } catch (error) {
            console.error('❌ 首次登录过程中出错:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 刷新登录
     */
    async refreshLogin() {
        try {
            console.log('🔄 检测到Cookie失效，在现有浏览器中打开新窗口进行登录...');
            
            // 确保连接到用户浏览器
            if (!this.browser) {
                this.browser = await this.launchUserBrowser();
            }
            
            // 在现有浏览器中打开新的标签页
            console.log('🌐 正在现有浏览器中打开新的标签页...');
            this.context = await this.browser.newContext();
            this.page = await this.context.newPage();
            
            // 访问小红书登录页面
            console.log('🔗 正在访问小红书登录页面...');
            await this.page.goto('https://www.xiaohongshu.com/explore', { 
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            
            console.log('💡 请在浏览器的新标签页中完成登录（支持扫码登录）...');
            console.log('⏳ 程序将自动检测登录状态...');
            
            // 等待登录完成
            const loginSuccess = await this.waitForLogin();
            
            if (loginSuccess) {
                // 保存新Cookie
                await this.saveCookies();
                console.log('✅ 刷新登录成功，新Cookie已保存');
                return { success: true, cookies: await this.context.cookies() };
            } else {
                console.log('❌ 刷新登录失败');
                return { success: false, error: '登录超时' };
            }
            
        } catch (error) {
            console.error('❌ 刷新登录过程中出错:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 等待登录完成
     */
    async waitForLogin() {
        try {
            const maxWaitTime = 300000; // 5分钟
            const checkInterval = 5000; // 5秒检查一次
            let elapsedTime = 0;
            
            while (elapsedTime < maxWaitTime) {
                const loginStatus = await this.checkLoginStatus();
                if (loginStatus.isLoggedIn) {
                    console.log('🎉 检测到登录成功！');
                    return true;
                }
                
                await this.page.waitForTimeout(checkInterval);
                elapsedTime += checkInterval;
                
                if (elapsedTime % 30000 === 0) {
                    console.log(`⏳ 已等待 ${elapsedTime / 1000} 秒，请继续登录...`);
                }
            }
            
            console.log('⏰ 等待登录超时');
            return false;
            
        } catch (error) {
            console.error('❌ 等待登录时出错:', error.message);
            return false;
        }
    }

    /**
     * 保存Cookie
     */
    async saveCookies() {
        try {
            const cookies = await this.context.cookies();
            
            // 备份现有Cookie
            if (await fs.pathExists(this.cookieFile)) {
                await fs.copy(this.cookieFile, this.backupFile);
                console.log('💾 已备份现有Cookie');
            }
            
            // 保存新Cookie
            await fs.writeJson(this.cookieFile, cookies, { spaces: 2 });
            console.log(`💾 已保存 ${cookies.length} 个Cookie到 ${this.cookieFile}`);
            
        } catch (error) {
            console.error('❌ 保存Cookie失败:', error.message);
        }
    }

    /**
     * 获取有效的浏览器上下文
     */
    async getValidContext() {
        try {
            const result = await this.manageCookies();
            
            if (result.success) {
                return {
                    browser: this.browser,
                    context: this.context,
                    page: this.page,
                    cookies: result.cookies
                };
            } else {
                throw new Error(result.error || 'Cookie管理失败');
            }
            
        } catch (error) {
            console.error('❌ 获取有效上下文失败:', error.message);
            throw error;
        }
    }

    /**
     * 关闭浏览器
     */
    async close() {
        try {
            if (this.browser) {
                await this.browser.close();
                console.log('🔒 浏览器已关闭');
            }
        } catch (error) {
            console.error('❌ 关闭浏览器时出错:', error.message);
        }
    }
}

// 使用示例
async function testEnhancedCookieManager() {
    const cookieManager = new EnhancedCookieManager();
    
    try {
        const result = await cookieManager.manageCookies();
        
        if (result.success) {
            console.log('\n✅ Cookie管理成功！');
            console.log(`📦 有效Cookie数量: ${result.cookies.length}`);
            console.log('💡 现在可以开始下载图片了');
        } else {
            console.log('\n❌ Cookie管理失败');
            console.log(`错误: ${result.error}`);
        }
        
    } catch (error) {
        console.error('❌ 测试过程中出错:', error.message);
    } finally {
        await cookieManager.close();
    }
}

// 如果直接运行此文件
if (require.main === module) {
    testEnhancedCookieManager();
}

module.exports = { EnhancedCookieManager };
