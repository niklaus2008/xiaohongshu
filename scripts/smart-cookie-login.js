/**
 * 智能Cookie登录验证
 * 自动检测Cookie有效性，避免重复扫码登录
 */

const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

class SmartCookieLogin {
    constructor() {
        this.cookieFile = './cookies.json';
        this.browser = null;
        this.page = null;
    }

    /**
     * 智能Cookie验证和登录
     */
    async smartLogin() {
        try {
            console.log('🔍 开始智能Cookie验证...\n');
            
            // 1. 检查Cookie文件是否存在
            if (!await fs.pathExists(this.cookieFile)) {
                console.log('❌ Cookie文件不存在，需要首次登录');
                return await this.firstTimeLogin();
            }

            // 2. 加载现有Cookie
            console.log('🍪 加载现有Cookie...');
            const cookies = await fs.readJson(this.cookieFile);
            console.log(`✅ 找到 ${cookies.length} 个Cookie`);

            // 3. 验证Cookie有效性
            const isValid = await this.validateCookies(cookies);
            if (isValid) {
                console.log('✅ Cookie有效，无需重新登录！');
                return true;
            } else {
                console.log('⚠️ Cookie已失效，需要重新登录');
                return await this.refreshLogin();
            }

        } catch (error) {
            console.error('❌ 智能登录失败:', error.message);
            return false;
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
            
            const context = await this.browser.newContext();
            this.page = await context.newPage();
            
            // 加载Cookie
            await context.addCookies(cookies);
            
            // 访问需要登录的页面
            await this.page.goto('https://www.xiaohongshu.com/explore', { 
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            await this.page.waitForTimeout(5000);
            
            // 检查登录状态
            const isLoggedIn = await this.checkLoginStatus();
            
            if (isLoggedIn) {
                console.log('✅ Cookie验证成功，用户已登录');
                return true;
            } else {
                console.log('❌ Cookie验证失败，需要重新登录');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Cookie验证过程中出错:', error.message);
            return false;
        }
    }

    /**
     * 检查登录状态
     */
    async checkLoginStatus() {
        try {
            const loginInfo = await this.page.evaluate(() => {
                const bodyText = document.body ? document.body.innerText : '';
                return {
                    hasLoginPrompt: bodyText.includes('登录后查看搜索结果') || 
                                   bodyText.includes('扫码登录') || 
                                   bodyText.includes('手机号登录'),
                    hasUserElements: document.querySelectorAll('.avatar, .user-avatar, .profile-avatar').length > 0,
                    hasContent: document.querySelectorAll('.note-item, .feed-item, .content-item').length > 0,
                    url: window.location.href
                };
            });
            
            // 如果页面显示登录提示，说明未登录
            if (loginInfo.hasLoginPrompt) {
                return false;
            }
            
            // 如果有用户元素或内容，说明已登录
            if (loginInfo.hasUserElements || loginInfo.hasContent) {
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ 检查登录状态时出错:', error.message);
            return false;
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
            
            const context = await this.browser.newContext();
            this.page = await context.newPage();
            
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
                return true;
            } else {
                console.log('❌ 首次登录失败');
                return false;
            }
            
        } catch (error) {
            console.error('❌ 首次登录过程中出错:', error.message);
            return false;
        }
    }

    /**
     * 刷新登录（Cookie失效时）
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
            const context = await this.browser.newContext();
            this.page = await context.newPage();
            
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
                return true;
            } else {
                console.log('❌ 刷新登录失败');
                return false;
            }
            
        } catch (error) {
            console.error('❌ 刷新登录过程中出错:', error.message);
            return false;
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
                const isLoggedIn = await this.checkLoginStatus();
                if (isLoggedIn) {
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
            const cookies = await this.page.context().cookies();
            await fs.writeJson(this.cookieFile, cookies, { spaces: 2 });
            console.log(`💾 已保存 ${cookies.length} 个Cookie到 ${this.cookieFile}`);
        } catch (error) {
            console.error('❌ 保存Cookie失败:', error.message);
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
async function testSmartLogin() {
    const smartLogin = new SmartCookieLogin();
    
    try {
        const success = await smartLogin.smartLogin();
        
        if (success) {
            console.log('\n✅ 智能登录成功！');
            console.log('💡 现在可以开始下载图片了');
        } else {
            console.log('\n❌ 智能登录失败');
        }
        
    } catch (error) {
        console.error('❌ 测试过程中出错:', error.message);
    } finally {
        await smartLogin.close();
    }
}

// 如果直接运行此文件
if (require.main === module) {
    testSmartLogin();
}

module.exports = { SmartCookieLogin };