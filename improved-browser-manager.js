/**
 * 改进的浏览器实例管理器
 * 确保正确复用浏览器实例，避免重复登录
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs-extra');

class ImprovedBrowserManager {
    constructor(options = {}) {
        this.userDataDir = options.userDataDir || './browser-data';
        this.browser = null;
        this.context = null;
        this.page = null;
        this.isInitialized = false;
        this.isInitializing = false;
        this.lock = false;
        
        // 配置选项
        this.config = {
            headless: options.headless !== undefined ? options.headless : false,
            timeout: options.timeout || 30000,
            enablePersistence: true,
            maxRetries: 3,
            retryDelay: 2000
        };
    }

    /**
     * 获取浏览器实例（确保复用）
     */
    async getBrowserInstance() {
        // 如果已经初始化且有效，直接返回
        if (this.isInitialized && this.browser && this.context) {
            try {
                // 验证浏览器实例是否仍然有效
                await this.context.pages();
                console.log('✅ 复用现有浏览器实例');
                return {
                    browser: this.browser,
                    context: this.context,
                    page: this.page,
                    isInitialized: this.isInitialized
                };
            } catch (error) {
                console.log('⚠️ 现有浏览器实例无效，重新初始化...');
                await this.cleanup();
            }
        }

        // 如果正在初始化，等待完成
        if (this.isInitializing || this.lock) {
            console.log('⏳ 浏览器正在初始化中，等待完成...');
            await this.waitForInitialization();
            
            if (this.isInitialized && this.browser && this.context) {
                return {
                    browser: this.browser,
                    context: this.context,
                    page: this.page,
                    isInitialized: this.isInitialized
                };
            }
        }

        // 初始化新的浏览器实例
        return await this.initializeBrowser();
    }

    /**
     * 等待初始化完成
     */
    async waitForInitialization() {
        let waitCount = 0;
        const maxWait = 300; // 30秒
        
        while (this.isInitializing || this.lock) {
            await new Promise(resolve => setTimeout(resolve, 100));
            waitCount++;
            
            if (waitCount > maxWait) {
                console.log('⚠️ 等待浏览器初始化超时，强制重置...');
                this.isInitializing = false;
                this.lock = false;
                break;
            }
        }
    }

    /**
     * 初始化浏览器实例
     */
    async initializeBrowser() {
        if (this.isInitializing || this.lock) {
            console.log('⚠️ 浏览器正在初始化中，跳过重复初始化');
            return await this.waitForInitialization();
        }

        this.isInitializing = true;
        this.lock = true;

        try {
            console.log('🚀 初始化浏览器实例...');
            
            // 确保用户数据目录存在
            await fs.ensureDir(this.userDataDir);
            
            // 使用持久化上下文，确保Cookie和登录状态持久化
            const context = await chromium.launchPersistentContext(this.userDataDir, {
                headless: this.config.headless,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--user-data-dir=' + this.userDataDir
                ],
                timeout: this.config.timeout
            });

            // 创建新页面
            const page = await context.newPage();
            
            // 设置用户代理
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // 保存实例
            this.browser = context;
            this.context = context;
            this.page = page;
            this.isInitialized = true;
            
            console.log('✅ 浏览器实例初始化完成');
            
            return {
                browser: this.browser,
                context: this.context,
                page: this.page,
                isInitialized: this.isInitialized
            };
            
        } catch (error) {
            console.error('❌ 初始化浏览器实例失败:', error.message);
            await this.cleanup();
            throw error;
        } finally {
            this.isInitializing = false;
            this.lock = false;
        }
    }

    /**
     * 加载Cookie到浏览器
     */
    async loadCookies(cookies) {
        try {
            if (!this.context || !cookies || cookies.length === 0) {
                console.log('⚠️ 无法加载Cookie：上下文无效或Cookie为空');
                return false;
            }

            console.log(`🍪 正在加载 ${cookies.length} 个Cookie...`);
            
            // 清除现有Cookie
            await this.context.clearCookies();
            
            // 添加新Cookie
            await this.context.addCookies(cookies);
            
            console.log('✅ Cookie加载完成');
            return true;
            
        } catch (error) {
            console.error('❌ 加载Cookie失败:', error.message);
            return false;
        }
    }

    /**
     * 验证登录状态
     */
    async validateLoginStatus() {
        try {
            if (!this.page) {
                console.log('⚠️ 页面实例无效，无法验证登录状态');
                return { isValid: false, reason: '页面实例无效' };
            }

            console.log('🔍 验证登录状态...');
            
            // 访问小红书页面
            await this.page.goto('https://www.xiaohongshu.com/explore', { 
                waitUntil: 'domcontentloaded',
                timeout: this.config.timeout
            });
            
            await this.page.waitForTimeout(3000);
            
            // 检查登录状态
            const loginStatus = await this.checkLoginStatus();
            
            if (loginStatus.isLoggedIn) {
                console.log('✅ 登录状态验证成功');
                return { isValid: true, reason: '登录状态有效' };
            } else {
                console.log(`❌ 登录状态验证失败: ${loginStatus.reason}`);
                return { isValid: false, reason: loginStatus.reason };
            }
            
        } catch (error) {
            console.error('❌ 验证登录状态时出错:', error.message);
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
     * 获取当前Cookie
     */
    async getCurrentCookies() {
        try {
            if (!this.context) {
                console.log('⚠️ 上下文无效，无法获取Cookie');
                return [];
            }

            const cookies = await this.context.cookies();
            console.log(`📦 获取到 ${cookies.length} 个Cookie`);
            return cookies;
            
        } catch (error) {
            console.error('❌ 获取Cookie失败:', error.message);
            return [];
        }
    }

    /**
     * 清理资源
     */
    async cleanup() {
        try {
            if (this.context) {
                await this.context.close();
                console.log('🔒 浏览器上下文已关闭');
            }
            
            this.browser = null;
            this.context = null;
            this.page = null;
            this.isInitialized = false;
            
        } catch (error) {
            console.error('❌ 清理资源时出错:', error.message);
        }
    }

    /**
     * 检查实例是否有效
     */
    async isInstanceValid() {
        try {
            if (!this.context || !this.page) {
                return false;
            }
            
            await this.page.evaluate(() => document.title);
            return true;
            
        } catch (error) {
            return false;
        }
    }
}

// 使用示例
async function testImprovedBrowserManager() {
    const manager = new ImprovedBrowserManager();
    
    try {
        console.log('🧪 开始测试改进的浏览器管理器...\n');
        
        // 测试1：初始化浏览器
        console.log('🔍 测试1：初始化浏览器');
        const browserInfo = await manager.getBrowserInstance();
        console.log('✅ 浏览器初始化成功');
        
        // 测试2：验证实例有效性
        console.log('\n🔍 测试2：验证实例有效性');
        const isValid = await manager.isInstanceValid();
        console.log(`✅ 实例有效性: ${isValid}`);
        
        // 测试3：获取Cookie
        console.log('\n🔍 测试3：获取Cookie');
        const cookies = await manager.getCurrentCookies();
        console.log(`✅ 获取到 ${cookies.length} 个Cookie`);
        
        console.log('\n🎉 所有测试通过！');
        
    } catch (error) {
        console.error('❌ 测试过程中出错:', error.message);
    } finally {
        await manager.cleanup();
    }
}

// 如果直接运行此文件
if (require.main === module) {
    testImprovedBrowserManager();
}

module.exports = { ImprovedBrowserManager };
