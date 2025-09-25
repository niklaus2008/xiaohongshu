/**
 * Cookie持久化问题修复脚本
 * 解决重复登录问题，确保Cookie正确持久化
 */

const fs = require('fs-extra');
const path = require('path');
const { ImprovedCookieValidator } = require('./improved-cookie-validator');
const { ImprovedBrowserManager } = require('./improved-browser-manager');

class CookiePersistenceFixer {
    constructor(options = {}) {
        this.cookieFile = options.cookieFile || './cookies.json';
        this.backupFile = options.backupFile || './cookies-backup.json';
        this.userDataDir = options.userDataDir || './browser-data';
        
        this.cookieValidator = new ImprovedCookieValidator({
            cookieFile: this.cookieFile,
            backupFile: this.backupFile
        });
        
        this.browserManager = new ImprovedBrowserManager({
            userDataDir: this.userDataDir,
            headless: false
        });
    }

    /**
     * 修复Cookie持久化问题
     */
    async fixCookiePersistence() {
        try {
            console.log('🔧 开始修复Cookie持久化问题...\n');
            
            // 1. 检查当前Cookie状态
            console.log('📋 步骤1：检查当前Cookie状态');
            const cookieStatus = await this.checkCookieStatus();
            console.log(`📊 Cookie状态: ${cookieStatus.summary}`);
            
            // 2. 验证Cookie有效性
            console.log('\n📋 步骤2：验证Cookie有效性');
            const validation = await this.cookieValidator.manageCookies();
            
            if (validation.success && !validation.needsLogin) {
                console.log('✅ Cookie验证成功，无需重新登录');
                return { success: true, message: 'Cookie有效，无需重新登录' };
            }
            
            // 3. 如果需要重新登录，提供解决方案
            console.log('\n📋 步骤3：处理登录需求');
            if (validation.needsLogin) {
                console.log('⚠️ 需要重新登录，但会使用持久化浏览器实例');
                return await this.handleReLogin();
            }
            
            return { success: false, message: 'Cookie验证失败' };
            
        } catch (error) {
            console.error('❌ 修复过程中出错:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 检查Cookie状态
     */
    async checkCookieStatus() {
        try {
            const cookieExists = await fs.pathExists(this.cookieFile);
            const backupExists = await fs.pathExists(this.backupFile);
            
            let cookieCount = 0;
            let validCookieCount = 0;
            let expiredCookieCount = 0;
            
            if (cookieExists) {
                const cookies = await fs.readJson(this.cookieFile);
                cookieCount = cookies.length;
                
                const now = Date.now() / 1000;
                cookies.forEach(cookie => {
                    if (cookie.expires && cookie.expires <= now) {
                        expiredCookieCount++;
                    } else {
                        validCookieCount++;
                    }
                });
            }
            
            return {
                cookieExists,
                backupExists,
                cookieCount,
                validCookieCount,
                expiredCookieCount,
                summary: `${validCookieCount}/${cookieCount} 个Cookie有效`
            };
            
        } catch (error) {
            console.error('❌ 检查Cookie状态时出错:', error.message);
            return {
                cookieExists: false,
                backupExists: false,
                cookieCount: 0,
                validCookieCount: 0,
                expiredCookieCount: 0,
                summary: '检查失败'
            };
        }
    }

    /**
     * 处理重新登录
     */
    async handleReLogin() {
        try {
            console.log('🔄 处理重新登录...');
            
            // 获取浏览器实例
            const browserInfo = await this.browserManager.getBrowserInstance();
            if (!browserInfo.isInitialized) {
                throw new Error('无法获取浏览器实例');
            }
            
            // 访问小红书登录页面
            console.log('🌐 访问小红书登录页面...');
            await browserInfo.page.goto('https://www.xiaohongshu.com/explore', { 
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            
            console.log('💡 请在浏览器中完成登录（支持扫码登录）...');
            console.log('⏳ 程序将自动检测登录状态...');
            
            // 等待登录完成
            const loginSuccess = await this.waitForLogin(browserInfo.page);
            
            if (loginSuccess) {
                // 保存新Cookie
                const cookies = await this.browserManager.getCurrentCookies();
                await this.cookieValidator.saveCookies(cookies);
                
                console.log('✅ 重新登录成功，新Cookie已保存');
                return { success: true, message: '重新登录成功' };
            } else {
                console.log('❌ 重新登录失败');
                return { success: false, message: '重新登录失败' };
            }
            
        } catch (error) {
            console.error('❌ 处理重新登录时出错:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 等待登录完成
     */
    async waitForLogin(page) {
        try {
            const maxWaitTime = 300000; // 5分钟
            const checkInterval = 5000; // 5秒检查一次
            let elapsedTime = 0;
            
            while (elapsedTime < maxWaitTime) {
                const loginStatus = await this.checkLoginStatus(page);
                if (loginStatus.isLoggedIn) {
                    console.log('🎉 检测到登录成功！');
                    return true;
                }
                
                await page.waitForTimeout(checkInterval);
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
     * 检查登录状态
     */
    async checkLoginStatus(page) {
        try {
            const pageInfo = await page.evaluate(() => {
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
     * 清理资源
     */
    async cleanup() {
        try {
            await this.browserManager.cleanup();
            console.log('🔒 资源清理完成');
        } catch (error) {
            console.error('❌ 清理资源时出错:', error.message);
        }
    }
}

// 使用示例
async function testCookiePersistenceFix() {
    const fixer = new CookiePersistenceFixer();
    
    try {
        console.log('🧪 开始测试Cookie持久化修复...\n');
        
        const result = await fixer.fixCookiePersistence();
        
        if (result.success) {
            console.log('\n✅ Cookie持久化修复成功！');
            console.log(`📝 结果: ${result.message}`);
        } else {
            console.log('\n❌ Cookie持久化修复失败');
            console.log(`📝 错误: ${result.error || result.message}`);
        }
        
    } catch (error) {
        console.error('❌ 测试过程中出错:', error.message);
    } finally {
        await fixer.cleanup();
    }
}

// 如果直接运行此文件
if (require.main === module) {
    testCookiePersistenceFix();
}

module.exports = { CookiePersistenceFixer };
