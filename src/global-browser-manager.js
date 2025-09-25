/**
 * 全局浏览器实例管理器
 * 确保整个系统只使用一个浏览器实例，避免重复打开窗口
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs-extra');

class GlobalBrowserManager {
    constructor() {
        this._browser = null;
        this._page = null;
        this._isInitialized = false;
        this._isInitializing = false;
        this._lock = false;
    }

    /**
     * 获取全局浏览器实例
     * @returns {Promise<Object>} 浏览器实例信息
     */
    async getBrowserInstance() {
        // 如果已经初始化，直接返回
        if (this._isInitialized && this._browser && this._page) {
            try {
                // 验证浏览器实例是否仍然有效
                await this._page.evaluate(() => document.title);
                return {
                    browser: this._browser,
                    page: this._page,
                    isInitialized: this._isInitialized
                };
            } catch (error) {
                console.log('⚠️ 全局浏览器实例无效，重新初始化...');
                this._browser = null;
                this._page = null;
                this._isInitialized = false;
            }
        }

        // 如果正在初始化，等待完成
        if (this._isInitializing || this._lock) {
            console.log('⏳ 全局浏览器正在初始化中，等待完成...');
            let waitCount = 0;
            while (this._isInitializing || this._lock) {
                await new Promise(resolve => setTimeout(resolve, 100));
                waitCount++;
                // 防止无限等待，最多等待30秒
                if (waitCount > 300) {
                    console.log('⚠️ 等待全局浏览器初始化超时，强制重置...');
                    this._isInitializing = false;
                    this._lock = false;
                    break;
                }
            }
            
            // 检查是否已初始化
            if (this._isInitialized && this._browser && this._page) {
                return {
                    browser: this._browser,
                    page: this._page,
                    isInitialized: this._isInitialized
                };
            }
        }

        // 初始化全局浏览器实例
        return await this._initializeBrowser();
    }

    /**
     * 初始化全局浏览器实例
     * @private
     * @returns {Promise<Object>} 浏览器实例信息
     */
    async _initializeBrowser() {
        if (this._isInitializing || this._lock) {
            console.log('⏳ 全局浏览器正在初始化中，等待完成...');
            while (this._isInitializing || this._lock) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            if (this._isInitialized && this._browser && this._page) {
                return {
                    browser: this._browser,
                    page: this._page,
                    isInitialized: this._isInitialized
                };
            }
        }

        try {
            this._isInitializing = true;
            this._lock = true;
            console.log('🚀 正在初始化全局浏览器实例...');
            
            // 添加超时机制，防止初始化过程卡住
            const initTimeout = setTimeout(() => {
                if (this._isInitializing) {
                    console.log('⚠️ 全局浏览器初始化超时，强制重置...');
                    this._isInitializing = false;
                    this._lock = false;
                }
            }, 60000); // 60秒超时

            // 设置用户数据目录，确保Cookie和缓存持久化
            const userDataDir = path.join(process.cwd(), 'browser-data');
            
            try {
                // 使用launchPersistentContext来支持用户数据目录
                const context = await chromium.launchPersistentContext(userDataDir, {
                    headless: false, // 显示浏览器窗口
                    args: [
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
                    ]
                });
                
                // 从持久化上下文中获取浏览器实例
                this._browser = context.browser();
                
                // 创建新页面
                this._page = await context.newPage();
                
                // 设置超时时间
                this._page.setDefaultTimeout(30000);
                
                console.log('✅ 全局浏览器实例初始化完成');
                this._isInitialized = true;
                
                return {
                    browser: this._browser,
                    page: this._page,
                    isInitialized: this._isInitialized
                };
                
            } catch (error) {
                if (error.message.includes('ProcessSingleton') || error.message.includes('profile is already in use')) {
                    console.log('⚠️ 用户数据目录被占用，尝试清理后重新启动...');
                    
                    // 清理用户数据目录
                    try {
                        await fs.remove(userDataDir);
                        console.log('✅ 已清理用户数据目录');
                        
                        // 重新尝试启动
                        const context = await chromium.launchPersistentContext(userDataDir, {
                            headless: false,
                            args: [
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
                            ]
                        });
                        
                        this._browser = context.browser();
                        this._page = await context.newPage();
                        this._page.setDefaultTimeout(30000);
                        
                        console.log('✅ 重新启动全局浏览器成功');
                        this._isInitialized = true;
                        
                        return {
                            browser: this._browser,
                            page: this._page,
                            isInitialized: this._isInitialized
                        };
                        
                    } catch (retryError) {
                        console.log('⚠️ 清理后仍无法启动，回退到普通模式...');
                        // 回退到普通启动模式
                        this._browser = await chromium.launch({
                            headless: false,
                            args: [
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
                            ]
                        });
                        
                        const context = await this._browser.newContext({
                            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            viewport: { width: 1920, height: 1080 }
                        });
                        
                        this._page = await context.newPage();
                        this._page.setDefaultTimeout(30000);
                        
                        console.log('✅ 全局浏览器实例初始化完成（回退模式）');
                        this._isInitialized = true;
                        
                        return {
                            browser: this._browser,
                            page: this._page,
                            isInitialized: this._isInitialized
                        };
                    }
                } else {
                    throw error;
                }
            }
            
        } catch (error) {
            console.error('❌ 全局浏览器实例初始化失败:', error.message);
            throw error;
        } finally {
            // 清理超时机制
            if (typeof initTimeout !== 'undefined') {
                clearTimeout(initTimeout);
            }
            // 重置初始化标志
            this._isInitializing = false;
            this._lock = false;
        }
    }


    /**
     * 创建新页面（使用全局浏览器实例）
     * @returns {Promise<Object>} 新页面实例
     */
    async createNewPage() {
        const browserInfo = await this.getBrowserInstance();
        const newPage = await browserInfo.browser.newPage();
        return newPage;
    }

    /**
     * 关闭全局浏览器实例
     */
    async close() {
        try {
            if (this._browser) {
                await this._browser.close();
                console.log('✅ 全局浏览器实例已关闭');
            }
        } catch (error) {
            console.log('⚠️ 关闭全局浏览器实例时出现警告:', error.message);
        } finally {
            this._browser = null;
            this._page = null;
            this._isInitialized = false;
        }
    }

    /**
     * 重置全局浏览器实例
     */
    async reset() {
        await this.close();
        console.log('🔄 全局浏览器实例已重置');
    }
}

// 创建全局单例
const globalBrowserManager = new GlobalBrowserManager();

module.exports = globalBrowserManager;
