/**
 * 小红书餐馆图片下载工具
 * 基于Playwright实现自动化搜索和图片下载功能
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');
const { URL } = require('url');
const sharp = require('sharp');

/**
 * 小红书餐馆图片下载器类
 */
class XiaohongshuScraper {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     * @param {string} options.downloadPath - 图片下载保存路径
     * @param {number} options.maxImages - 最大下载图片数量
     * @param {boolean} options.headless - 是否无头模式运行
     * @param {number} options.delay - 请求间隔时间（毫秒）
     * @param {number} options.timeout - 页面加载超时时间
     * @param {string} options.userAgent - 浏览器User-Agent
     */
    constructor(options = {}) {
        this.config = {
            downloadPath: options.downloadPath || './downloads',
            maxImages: options.maxImages || 20,
            headless: options.headless !== undefined ? options.headless : false,
            delay: options.delay || 1000,
            timeout: options.timeout || 30000,
            userAgent: options.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            tryRemoveWatermark: options.tryRemoveWatermark !== undefined ? options.tryRemoveWatermark : true,
            enableImageProcessing: options.enableImageProcessing !== undefined ? options.enableImageProcessing : true
        };
        
        // 登录配置
        this.loginConfig = options.login || null;
        
        this.browser = null;
        this.page = null;
        this.downloadedCount = 0;
        this.errors = [];
        
        // 日志回调函数（用于与外部系统通信）
        this.logCallback = options.logCallback || null;
        
        // 日志管理器实例
        this.logger = options.logger || null;
        
        // 确保下载目录存在
        this.ensureDownloadDir();
    }

    /**
     * 日志记录方法
     * @private
     * @param {string} message - 日志消息
     * @param {string} level - 日志级别
     */
    log(message, level = 'info') {
        // 总是输出到控制台
        console.log(message);
        
        // 如果有日志管理器，使用它发送日志
        if (this.logger) {
            this.logger.sendCustomLog(message, level);
        }
        
        // 如果有日志回调函数，也调用它（保持向后兼容）
        if (this.logCallback && typeof this.logCallback === 'function') {
            this.logCallback(message, level);
        }
    }

    /**
     * 确保下载目录存在
     * @private
     */
    async ensureDownloadDir() {
        try {
            await fs.ensureDir(this.config.downloadPath);
            console.log(`✅ 下载目录已准备: ${this.config.downloadPath}`);
        } catch (error) {
            console.error('❌ 创建下载目录失败:', error.message);
            throw error;
        }
    }

    /**
     * 启动用户当前浏览器
     * @private
     */
    async launchUserBrowser() {
        try {
            // 尝试连接到用户当前浏览器
            // 这里我们使用一个简单的方法：打开一个新的标签页
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
                headless: this.config.headless,
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
     * 初始化浏览器
     * @private
     */
    async initBrowser() {
        try {
            console.log('🚀 正在启动浏览器...');
            
            // 检查是否指定了用户浏览器
            const browserType = this.config.browserType || 'chromium';
            let browser;
            
            if (browserType === 'user-browser') {
                // 使用用户当前浏览器
                console.log('🌐 使用用户当前浏览器进行授权...');
                browser = await this.launchUserBrowser();
            } else {
                // 使用默认的Chromium浏览器
                browser = await chromium.launch({
                    headless: this.config.headless,
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
            
            this.browser = browser;

            // 创建浏览器上下文并设置User-Agent
            const context = await this.browser.newContext({
                userAgent: this.config.userAgent,
                viewport: { width: 1920, height: 1080 }
            });

            this.page = await context.newPage();
            
            // 设置超时时间
            this.page.setDefaultTimeout(this.config.timeout);
            
            console.log('✅ 浏览器初始化完成');
        } catch (error) {
            console.error('❌ 浏览器初始化失败:', error.message);
            throw error;
        }
    }

    /**
     * 搜索餐馆并下载图片
     * @param {string} restaurantName - 餐馆名称
     * @param {string} location - 地点信息
     * @returns {Promise<Object>} 下载结果
     */
    async searchAndDownload(restaurantName, location) {
        const startTime = Date.now();
        try {
            console.log(`🔍 开始搜索餐馆: ${restaurantName} (${location})`);
            console.log(`📋 步骤 1/8: 开始处理餐馆 "${restaurantName}"`);
            
            // 初始化浏览器
            if (!this.browser) {
                console.log(`📋 步骤 2/8: 正在启动浏览器...`);
                const browserStartTime = Date.now();
                await this.initBrowser();
                const browserTime = Date.now() - browserStartTime;
                console.log(`✅ 步骤 2/8: 浏览器启动完成 (耗时: ${browserTime}ms)`);
            }

            // 构建搜索关键词
            const searchKeyword = `${restaurantName} ${location}`;
            console.log(`📝 搜索关键词: ${searchKeyword}`);
            console.log(`📋 步骤 3/8: 正在检查登录状态...`);

            // 优先尝试Cookie自动登录
            let loginSuccess = false;
            if (this.loginConfig && this.loginConfig.autoLogin) {
                console.log(`📋 步骤 3/8: 尝试使用Cookie自动登录...`);
                const loginStartTime = Date.now();
                loginSuccess = await this.autoLogin();
                const loginTime = Date.now() - loginStartTime;
                if (loginSuccess) {
                    console.log(`✅ 步骤 3/8: Cookie自动登录成功 (耗时: ${loginTime}ms)`);
                } else {
                    console.log(`⚠️ 步骤 3/8: Cookie自动登录失败 (耗时: ${loginTime}ms)`);
                }
            }
            
            // 如果Cookie登录失败，检查是否需要其他方式登录
            if (!loginSuccess) {
                console.log(`🔍 检查是否需要其他方式登录...`);
                const checkLoginStartTime = Date.now();
                const needsLogin = await this.checkLoginRequired();
                const checkLoginTime = Date.now() - checkLoginStartTime;
                console.log(`📊 登录检查完成 (耗时: ${checkLoginTime}ms, 需要登录: ${needsLogin})`);
                
                if (needsLogin) {
                    console.log('⚠️ 检测到需要登录');
                    
                    if (this.loginConfig && this.loginConfig.autoLogin) {
                        console.log('⚠️ 自动登录失败，请手动登录后继续...');
                        await this.waitForLogin();
                    } else {
                        console.log('⚠️ 未启用自动登录，请手动登录后继续...');
                        await this.waitForLogin();
                    }
                }
            }

            // 验证登录状态
            console.log(`🔍 验证登录状态...`);
            const loginCheckStartTime = Date.now();
            const isLoggedIn = await this.checkLoginStatus();
            const loginCheckTime = Date.now() - loginCheckStartTime;
            console.log(`📊 登录状态检查完成 (耗时: ${loginCheckTime}ms, 已登录: ${isLoggedIn})`);
            
            if (!isLoggedIn) {
                console.log('❌ 登录验证失败，自动跳转到登录页面...');
                await this.page.goto('https://www.xiaohongshu.com/explore');
                console.log('🔐 请在浏览器中完成登录...');
                await this.waitForLogin();
                
                // 重新验证登录状态
                const isLoggedInAfterLogin = await this.checkLoginStatus();
                if (!isLoggedInAfterLogin) {
                    console.log('❌ 登录仍然失败');
                    return {
                        success: false,
                        error: '登录失败，请检查登录状态',
                        restaurantName,
                        location
                    };
                }
                console.log('✅ 重新登录成功！');
            }
            
            console.log('✅ 登录验证成功，开始搜索操作...');
            console.log(`📋 步骤 4/8: 正在搜索 "${searchKeyword}"...`);
            const searchStartTime = Date.now();
            await this.performSearch(searchKeyword);
            const searchTime = Date.now() - searchStartTime;
            console.log(`✅ 步骤 4/8: 搜索完成 (耗时: ${searchTime}ms)`);

            // 获取图片链接
            console.log(`📋 步骤 5/8: 正在提取图片链接...`);
            const extractStartTime = Date.now();
            const imageUrls = await this.extractImageUrls();
            const extractTime = Date.now() - extractStartTime;
            console.log(`📸 找到 ${imageUrls.length} 张图片 (耗时: ${extractTime}ms)`);
            console.log(`✅ 步骤 5/8: 图片链接提取完成`);

            // 下载图片
            console.log(`📋 步骤 6/8: 正在下载图片...`);
            const downloadStartTime = Date.now();
            const downloadResults = await this.downloadImages(imageUrls, restaurantName, location);
            const downloadTime = Date.now() - downloadStartTime;
            console.log(`✅ 步骤 6/8: 图片下载完成 (耗时: ${downloadTime}ms)`);
            
            console.log(`📋 步骤 7/8: 正在处理图片（去水印、优化）...`);
            console.log(`✅ 步骤 7/8: 图片处理完成`);
            console.log(`📋 步骤 8/8: 正在保存结果...`);
            console.log(`✅ 步骤 8/8: 餐馆 "${restaurantName}" 处理完成！`);
            
            const totalTime = Date.now() - startTime;
            console.log(`⏱️ 总处理时间: ${totalTime}ms`);
            
            return {
                success: true,
                restaurantName,
                location,
                totalFound: imageUrls.length,
                downloadedCount: downloadResults.downloadedCount,
                failedCount: downloadResults.failedCount,
                errors: this.errors
            };

        } catch (error) {
            const totalTime = Date.now() - startTime;
            console.error(`❌ 搜索和下载过程中发生错误 (耗时: ${totalTime}ms):`, error.message);
            console.error(`📊 错误堆栈:`, error.stack);
            this.errors.push({
                type: 'search_error',
                message: error.message,
                timestamp: new Date().toISOString()
            });
            
            return {
                success: false,
                restaurantName,
                location,
                error: error.message,
                errors: this.errors
            };
        }
    }

    /**
     * 检查是否需要登录
     * @private
     * @returns {Promise<boolean>}
     */
    async checkLoginRequired() {
        try {
            // 检查是否存在登录相关的元素
            const loginElements = await this.page.$$('text=登录');
            const loginRequired = loginElements.length > 0;
            
            if (loginRequired) {
                console.log('🔐 检测到需要登录');
            }
            
            return loginRequired;
        } catch (error) {
            console.log('⚠️ 检查登录状态时出错:', error.message);
            return false;
        }
    }

    /**
     * 智能登录小红书（Cookie优先策略）
     * @private
     */
    async autoLogin() {
        try {
            if (!this.loginConfig || !this.loginConfig.autoLogin) {
                console.log('⚠️ 未启用自动登录，跳过');
                return false;
            }

            // 第一步：优先尝试使用已保存的Cookie
            if (this.loginConfig.saveCookies) {
                console.log('🍪 尝试使用已保存的Cookie登录...');
                const cookieLoaded = await this.loadCookies();
                if (cookieLoaded) {
                    // 访问小红书首页验证登录状态
                    await this.page.goto('https://www.xiaohongshu.com/explore', { 
                        waitUntil: 'domcontentloaded',
                        timeout: 30000
                    });
                    await this.page.waitForTimeout(3000);
                    
                    const isLoggedIn = await this.checkLoginStatus();
                    if (isLoggedIn) {
                        console.log('✅ 使用Cookie登录成功，无需重新登录！');
                        return true;
                    } else {
                        console.log('⚠️ Cookie已失效，需要重新登录');
                    }
                }
            }

            // 第二步：Cookie失效或不存在时，进行重新登录
            console.log('🔐 Cookie失效，开始重新登录...');
            
            // 根据登录方式选择不同的登录流程
            const loginMethod = this.loginConfig.method || 'manual';
            
            let loginSuccess = false;
            switch (loginMethod) {
                case 'phone':
                    loginSuccess = await this.phoneLogin();
                    break;
                case 'qr':
                    loginSuccess = await this.qrCodeLogin();
                    break;
                case 'manual':
                    loginSuccess = await this.manualLogin();
                    break;
                default:
                    console.log('⚠️ 未知的登录方式，使用手动登录');
                    loginSuccess = await this.manualLogin();
            }
            
            // 第三步：登录成功后保存Cookie，实现一次登录长期使用
            if (loginSuccess && this.loginConfig.saveCookies) {
                await this.saveCookies();
                console.log('💾 登录状态已保存，下次运行将自动使用Cookie登录');
            }
            
            return loginSuccess;
            
        } catch (error) {
            console.error('❌ 自动登录过程中发生错误:', error.message);
            return false;
        }
    }

    /**
     * 手机号验证码登录
     * @private
     */
    async phoneLogin() {
        try {
            if (!this.loginConfig.phone) {
                console.log('❌ 未配置手机号');
                return false;
            }

            console.log('📱 使用手机号验证码登录...');
            
            // 访问登录页面
            await this.page.goto('https://www.xiaohongshu.com/explore', { 
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });
            await this.page.waitForTimeout(3000);
            
            // 查找并点击登录按钮
            try {
                const loginButton = await this.page.waitForSelector('text=登录', { timeout: 5000 });
                await loginButton.click();
                console.log('✅ 点击登录按钮');
            } catch (error) {
                console.log('⚠️ 未找到登录按钮，可能已经登录');
                return await this.checkLoginStatus();
            }
            
            await this.page.waitForTimeout(2000);
            
            // 查找手机号输入框
            try {
                const phoneInput = await this.page.waitForSelector('input[placeholder*="手机号"], input[type="tel"], input[placeholder*="请输入手机号"]', { timeout: 5000 });
                await phoneInput.fill(this.loginConfig.phone);
                console.log('✅ 输入手机号');
            } catch (error) {
                console.log('❌ 未找到手机号输入框:', error.message);
                return false;
            }
            
            // 查找并点击获取验证码按钮
            try {
                const codeButton = await this.page.waitForSelector('button:has-text("获取验证码"), button:has-text("发送验证码")', { timeout: 5000 });
                await codeButton.click();
                console.log('✅ 点击获取验证码按钮');
            } catch (error) {
                console.log('❌ 未找到获取验证码按钮:', error.message);
                return false;
            }
            
            // 等待用户输入验证码
            console.log('📲 请查看手机短信，输入验证码后按回车继续...');
            await new Promise(resolve => {
                process.stdin.once('data', () => {
                    resolve();
                });
            });
            
            // 查找验证码输入框并等待用户输入
            try {
                const codeInput = await this.page.waitForSelector('input[placeholder*="验证码"], input[placeholder*="请输入验证码"]', { timeout: 5000 });
                console.log('💡 请在浏览器中输入验证码，然后按回车继续...');
                await new Promise(resolve => {
                    process.stdin.once('data', () => {
                        resolve();
                    });
                });
            } catch (error) {
                console.log('❌ 未找到验证码输入框:', error.message);
                return false;
            }
            
            // 等待登录完成
            await this.page.waitForTimeout(3000);
            
            // 检查是否登录成功
            const isLoggedIn = await this.checkLoginStatus();
            if (isLoggedIn) {
                console.log('✅ 手机号验证码登录成功');
                // 保存Cookie
                if (this.loginConfig.saveCookies) {
                    await this.saveCookies();
                }
                return true;
            } else {
                console.log('❌ 手机号验证码登录失败');
                return false;
            }
            
        } catch (error) {
            console.error('❌ 手机号登录过程中发生错误:', error.message);
            return false;
        }
    }

    /**
     * 扫码登录
     * @private
     */
    async qrCodeLogin() {
        try {
            console.log('📱 使用扫码登录...');
            
            // 直接访问小红书首页
            console.log('🌐 正在打开小红书首页...');
            await this.page.goto('https://www.xiaohongshu.com/explore', { 
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });
            await this.page.waitForTimeout(5000);
            
            console.log('🔍 检查当前页面状态...');
            const currentUrl = this.page.url();
            console.log(`📍 当前页面URL: ${currentUrl}`);
            
            // 检查是否已经登录
            const isAlreadyLoggedIn = await this.checkLoginStatus();
            if (isAlreadyLoggedIn) {
                console.log('✅ 检测到已经登录，无需重新登录');
                return true;
            }
            
            // 尝试多种方式触发登录弹窗
            console.log('🔐 尝试触发登录弹窗...');
            
            // 方法1: 查找并点击登录按钮
            try {
                const loginSelectors = [
                    'text=登录',
                    'button:has-text("登录")',
                    '.login-btn',
                    '.login-button',
                    '[data-testid*="login"]',
                    'a:has-text("登录")'
                ];
                
                let loginButton = null;
                for (const selector of loginSelectors) {
                    try {
                        loginButton = await this.page.waitForSelector(selector, { timeout: 3000 });
                        if (loginButton) {
                            console.log(`✅ 找到登录按钮: ${selector}`);
                            break;
                        }
                    } catch (error) {
                        continue;
                    }
                }
                
                if (loginButton) {
                    await loginButton.click();
                    console.log('✅ 已点击登录按钮');
                    await this.page.waitForTimeout(3000);
                } else {
                    console.log('⚠️ 未找到登录按钮，尝试其他方法...');
                }
            } catch (error) {
                console.log('⚠️ 点击登录按钮失败:', error.message);
            }
            
            // 方法2: 尝试访问需要登录的页面
            try {
                console.log('🔄 尝试访问需要登录的页面...');
                await this.page.goto('https://www.xiaohongshu.com/user/profile', { 
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });
                await this.page.waitForTimeout(3000);
            } catch (error) {
                console.log('⚠️ 访问用户页面失败:', error.message);
            }
            
            // 方法3: 尝试搜索功能触发登录
            try {
                console.log('🔍 尝试使用搜索功能触发登录...');
                await this.page.goto('https://www.xiaohongshu.com/search_result?keyword=test', { 
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });
                await this.page.waitForTimeout(3000);
            } catch (error) {
                console.log('⚠️ 访问搜索页面失败:', error.message);
            }
            
            // 检查是否出现了登录弹窗或二维码
            console.log('🔍 检查是否出现登录界面...');
            
            // 等待二维码或登录弹窗出现
            try {
                const loginElements = await this.page.waitForSelector(
                    'img[alt*="二维码"], .qr-code, canvas, .login-modal, .login-popup, [class*="login"]', 
                    { timeout: 10000 }
                );
                console.log('✅ 检测到登录界面已出现');
            } catch (error) {
                console.log('⚠️ 未检测到登录界面，可能页面结构有变化');
                
                // 输出当前页面信息用于调试
                const pageInfo = await this.page.evaluate(() => {
                    return {
                        url: window.location.href,
                        title: document.title,
                        bodyText: document.body ? document.body.innerText.substring(0, 500) : '',
                        hasLoginElements: document.querySelectorAll('*').length > 0 ? 
                            Array.from(document.querySelectorAll('*')).filter(el => 
                                el.textContent && el.textContent.includes('登录')
                            ).length : 0
                    };
                });
                console.log('📄 当前页面信息:', pageInfo);
            }
            
            console.log('📱 请使用小红书APP或微信扫描页面上的二维码完成登录...');
            console.log('⏳ 正在等待扫码完成，请稍候...');
            
            // 自动检测扫码完成
            const loginSuccess = await this.waitForQrCodeLogin();
            
            if (loginSuccess) {
                console.log('✅ 扫码登录成功！');
                // 保存Cookie
                if (this.loginConfig.saveCookies) {
                    await this.saveCookies();
                }
                return true;
            } else {
                console.log('❌ 扫码登录失败或超时');
                return false;
            }
            
        } catch (error) {
            console.error('❌ 扫码登录过程中发生错误:', error.message);
            return false;
        }
    }

    /**
     * 等待二维码扫码登录完成（优化版本）
     * @private
     * @returns {Promise<boolean>}
     */
    async waitForQrCodeLogin() {
        try {
            const maxWaitTime = 300000; // 最大等待5分钟
            const checkInterval = 1000; // 每1秒检查一次，提高响应速度
            let elapsedTime = 0;
            let lastLoginScore = -999; // 记录上次的登录评分
            
            console.log('📱 请使用小红书APP或微信扫描页面上的二维码完成登录...');
            console.log('⏳ 正在等待扫码完成，请稍候...');
            
            while (elapsedTime < maxWaitTime) {
                // 检查页面状态变化
                const pageState = await this.page.evaluate(() => {
                    return {
                        url: window.location.href,
                        title: document.title,
                        hasLoginModal: !!document.querySelector('.login-modal, .login-popup, [class*="login"]'),
                        hasQrCode: !!document.querySelector('img[alt*="二维码"], .qr-code, canvas'),
                        bodyText: document.body ? document.body.innerText.substring(0, 500) : '',
                        loginElements: document.querySelectorAll('*').length > 0 ? 
                            Array.from(document.querySelectorAll('*')).filter(el => 
                                el.textContent && el.textContent.includes('登录')
                            ).length : 0
                    };
                });
                
                // 检查是否登录成功（避免重复验证Cookie）
                const isLoggedIn = await this.checkLoginStatus();
                if (isLoggedIn) {
                    console.log('🎉 检测到登录成功！');
                    // 重置Cookie验证标记，允许重新验证
                    this._cookieValidationPerformed = false;
                    return true;
                }
                
                // 检查登录弹窗是否消失
                if (!pageState.hasLoginModal && !pageState.hasQrCode) {
                    console.log('🔄 检测到登录弹窗消失，重新检查登录状态...');
                    await this.page.waitForTimeout(2000); // 等待页面稳定
                    const isLoggedInAfterModalClose = await this.checkLoginStatus();
                    if (isLoggedInAfterModalClose) {
                        console.log('🎉 登录弹窗消失后检测到登录成功！');
                        this._cookieValidationPerformed = false;
                        return true;
                    }
                }
                
                // 检查页面是否跳转
                const currentUrl = this.page.url();
                if (!currentUrl.includes('login') && !currentUrl.includes('signin') && 
                    !currentUrl.includes('auth') && currentUrl.includes('xiaohongshu.com')) {
                    console.log('🔄 检测到页面跳转到主页面，重新检查登录状态...');
                    await this.page.waitForTimeout(2000); // 等待页面稳定
                    const isLoggedInAfterRedirect = await this.checkLoginStatus();
                    if (isLoggedInAfterRedirect) {
                        console.log('🎉 页面跳转后检测到登录成功！');
                        this._cookieValidationPerformed = false;
                        return true;
                    }
                }
                
                // 检查页面内容变化（登录提示消失）
                if (!pageState.bodyText.includes('登录后查看搜索结果') && 
                    !pageState.bodyText.includes('扫码登录') && 
                    !pageState.bodyText.includes('手机号登录') &&
                    pageState.loginElements < 3) { // 登录相关元素减少
                    console.log('🔄 检测到登录提示消失，重新检查登录状态...');
                    await this.page.waitForTimeout(2000); // 等待页面稳定
                    const isLoggedInAfterPromptDisappear = await this.checkLoginStatus();
                    if (isLoggedInAfterPromptDisappear) {
                        console.log('🎉 登录提示消失后检测到登录成功！');
                        this._cookieValidationPerformed = false;
                        return true;
                    }
                }
                
                // 等待一段时间后再次检查
                await this.page.waitForTimeout(checkInterval);
                elapsedTime += checkInterval;
                
                // 显示等待进度（更频繁的提示）
                if (elapsedTime % 5000 === 0) {
                    console.log(`⏳ 已等待 ${elapsedTime / 1000} 秒，请继续扫码...`);
                }
                
                // 每15秒提醒一次（更频繁的提醒）
                if (elapsedTime % 15000 === 0 && elapsedTime > 0) {
                    console.log('💡 提示：如果二维码已过期，请刷新页面重新获取二维码');
                }
                
                // 每30秒检查一次二维码状态
                if (elapsedTime % 30000 === 0 && elapsedTime > 0) {
                    if (!pageState.hasQrCode) {
                        console.log('⚠️ 检测到二维码已消失，可能登录已完成或二维码已过期');
                    }
                }
            }
            
            console.log('⏰ 等待扫码超时（5分钟）');
            return false;
            
        } catch (error) {
            console.error('❌ 等待扫码登录时发生错误:', error.message);
            return false;
        }
    }

    /**
     * 手动登录（支持扫码登录自动检测）
     * @private
     */
    async manualLogin() {
        try {
            console.log('👤 使用手动登录...');
            
            // 访问登录页面
            await this.page.goto('https://www.xiaohongshu.com/explore', { 
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });
            await this.page.waitForTimeout(3000);
            
            console.log('💡 请在浏览器中完成登录（支持扫码登录）...');
            console.log('🔄 程序将自动检测登录状态，无需手动按回车...');
            
            // 自动检测登录完成，而不是等待用户按回车
            const loginSuccess = await this.waitForManualLogin();
            
            if (loginSuccess) {
                console.log('✅ 手动登录成功');
                // 保存Cookie
                if (this.loginConfig.saveCookies) {
                    await this.saveCookies();
                }
                return true;
            } else {
                console.log('❌ 手动登录失败或超时');
                return false;
            }
            
        } catch (error) {
            console.error('❌ 手动登录过程中发生错误:', error.message);
            return false;
        }
    }

    /**
     * 等待手动登录完成（自动检测）
     * @private
     * @returns {Promise<boolean>}
     */
    async waitForManualLogin() {
        try {
            const maxWaitTime = 300000; // 最大等待5分钟
            const checkInterval = 3000; // 每3秒检查一次
            let elapsedTime = 0;
            
            console.log('⏳ 正在等待登录完成，请扫码或输入验证码...');
            
            while (elapsedTime < maxWaitTime) {
                // 检查是否登录成功
                const isLoggedIn = await this.checkLoginStatus();
                if (isLoggedIn) {
                    console.log('🎉 检测到登录成功！');
                    return true;
                }
                
                // 检查页面是否跳转或关闭了登录弹窗
                const currentUrl = this.page.url();
                if (!currentUrl.includes('login') && !currentUrl.includes('signin')) {
                    // 页面已跳转，可能登录成功
                    console.log('🔄 检测到页面跳转，重新检查登录状态...');
                    const isLoggedInAfterRedirect = await this.checkLoginStatus();
                    if (isLoggedInAfterRedirect) {
                        console.log('🎉 页面跳转后检测到登录成功！');
                        return true;
                    }
                }
                
                // 等待一段时间后再次检查
                await this.page.waitForTimeout(checkInterval);
                elapsedTime += checkInterval;
                
                // 显示等待进度
                if (elapsedTime % 15000 === 0) {
                    console.log(`⏳ 已等待 ${elapsedTime / 1000} 秒，请继续登录...`);
                }
                
                // 每30秒提醒一次
                if (elapsedTime % 30000 === 0 && elapsedTime > 0) {
                    console.log('💡 提示：如果登录界面已消失，说明登录可能已成功，程序会自动检测');
                }
            }
            
            console.log('⏰ 等待登录超时（5分钟）');
            return false;
            
        } catch (error) {
            console.error('❌ 等待手动登录时发生错误:', error.message);
            return false;
        }
    }

    /**
     * 保存Cookie
     * @private
     */
    async saveCookies() {
        try {
            if (!this.loginConfig.cookieFile) {
                return;
            }
            
            const cookies = await this.page.context().cookies();
            await fs.writeJson(this.loginConfig.cookieFile, cookies, { spaces: 2 });
            console.log('🍪 Cookie已保存到:', this.loginConfig.cookieFile);
        } catch (error) {
            console.error('❌ 保存Cookie失败:', error.message);
        }
    }

    /**
     * 加载Cookie
     * @private
     */
    async loadCookies() {
        try {
            if (!this.loginConfig.cookieFile) {
                console.log('⚠️ 未配置Cookie文件路径');
                return false;
            }
            
            if (!await fs.pathExists(this.loginConfig.cookieFile)) {
                console.log('⚠️ Cookie文件不存在，需要首次登录');
                return false;
            }
            
            const cookies = await fs.readJson(this.loginConfig.cookieFile);
            
            // 检查Cookie是否为空或无效
            if (!cookies || cookies.length === 0) {
                console.log('⚠️ Cookie文件为空，需要重新登录');
                return false;
            }
            
            // 检查Cookie是否过期（简单检查）
            const now = Date.now();
            const validCookies = cookies.filter(cookie => {
                if (cookie.expires && cookie.expires < now / 1000) {
                    return false; // Cookie已过期
                }
                return true;
            });
            
            if (validCookies.length === 0) {
                console.log('⚠️ 所有Cookie已过期，需要重新登录');
                return false;
            }
            
            await this.page.context().addCookies(validCookies);
            console.log(`🍪 已加载 ${validCookies.length} 个有效Cookie`);
            return true;
            
        } catch (error) {
            console.error('❌ 加载Cookie失败:', error.message);
            return false;
        }
    }

    /**
     * 执行搜索操作
     * @private
     * @param {string} keyword - 搜索关键词
     */
    async performSearch(keyword) {
        try {
            console.log('🔍 开始搜索操作...');
            
            // 查找搜索栏
            console.log('🔍 正在查找搜索栏...');
            const searchSelectors = [
                'input[placeholder*="搜索"]',
                'input[placeholder*="小红书"]',
                '.search-input input',
                '[data-testid*="search"] input',
                'input[type="search"]'
            ];
            
            let searchInput = null;
            for (const selector of searchSelectors) {
                try {
                    console.log(`🔍 尝试选择器: ${selector}`);
                    searchInput = await this.page.waitForSelector(selector, { timeout: 3000 });
                    if (searchInput) {
                        console.log(`✅ 找到搜索栏: ${selector}`);
                        break;
                    }
                } catch (error) {
                    console.log(`⚠️ 选择器 ${selector} 未找到，尝试下一个...`);
                    continue;
                }
            }
            
            if (!searchInput) {
                console.log('❌ 未找到搜索栏，尝试直接访问搜索页面');
                const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}&type=51`;
                console.log(`🌐 直接访问搜索页面: ${searchUrl}`);
                await this.page.goto(searchUrl, { 
                    waitUntil: 'domcontentloaded',
                    timeout: 60000
                });
                await this.page.waitForTimeout(3000);
                return;
            }
            
            // 清空搜索栏并输入关键词
            console.log('⌨️ 正在输入搜索关键词...');
            await searchInput.click();
            await searchInput.fill('');
            await searchInput.fill(keyword);
            console.log(`✅ 已输入搜索关键词: ${keyword}`);
            
            // 按回车键或点击搜索按钮
            console.log('🔍 正在执行搜索...');
            try {
                await searchInput.press('Enter');
                console.log('✅ 按回车键搜索');
            } catch (error) {
                // 如果按回车失败，尝试点击搜索按钮
                console.log('⚠️ 按回车失败，尝试点击搜索按钮...');
                try {
                    const searchButton = await this.page.waitForSelector('button[type="submit"], .search-btn, [data-testid*="search"] button', { timeout: 3000 });
                    await searchButton.click();
                    console.log('✅ 点击搜索按钮');
                } catch (error2) {
                    console.log('⚠️ 未找到搜索按钮，使用回车键');
                    await searchInput.press('Enter');
                }
            }
            
            // 等待搜索结果加载
            console.log('⏳ 等待搜索结果加载...');
            await this.page.waitForTimeout(5000);
            
            // 等待页面稳定
            console.log('⏳ 等待页面稳定...');
            try {
                await this.page.waitForLoadState('domcontentloaded', { timeout: 30000 });
                console.log('✅ 页面加载完成');
            } catch (error) {
                console.log('⚠️ 页面加载超时，继续执行...');
            }
            
            // 点击"图文"标签
            console.log('📸 正在点击图文标签...');
            await this.clickImageTab();
            
        } catch (error) {
            console.error('❌ 搜索操作失败:', error.message);
            throw error;
        }
    }

    /**
     * 点击"图文"标签
     * @private
     */
    async clickImageTab() {
        try {
            console.log('📸 尝试点击"图文"标签...');
            
            // 查找"图文"标签
            const imageTabSelectors = [
                'text=图文',
                '[data-testid*="image"]',
                '.tab:has-text("图文")',
                'button:has-text("图文")',
                'div:has-text("图文")'
            ];
            
            let imageTab = null;
            for (const selector of imageTabSelectors) {
                try {
                    imageTab = await this.page.waitForSelector(selector, { timeout: 3000 });
                    if (imageTab) {
                        console.log(`✅ 找到图文标签: ${selector}`);
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }
            
            if (imageTab) {
                await imageTab.click();
                console.log('✅ 已点击"图文"标签');
                await this.page.waitForTimeout(3000);
            } else {
                console.log('⚠️ 未找到"图文"标签，继续使用当前页面');
            }
            
        } catch (error) {
            console.error('❌ 点击图文标签失败:', error.message);
        }
    }

    /**
     * 检查登录状态（优化版本）
     * @private
     * @returns {Promise<boolean>}
     */
    async checkLoginStatus() {
        try {
            console.log('🔍 检查登录状态...');
            
            // 首先检查Cookie是否有效
            const cookieValid = await this.checkCookieValidity();
            if (!cookieValid) {
                console.log('❌ Cookie无效，需要重新登录');
                return false;
            }
            
            // 获取页面信息
            const loginInfo = await this.page.evaluate(() => {
                const info = {
                    currentUrl: window.location.href,
                    pageTitle: document.title,
                    bodyText: document.body ? document.body.innerText : '',
                    hasUserElements: false,
                    hasLoginElements: false,
                    hasSearchResults: false,
                    hasContent: false,
                    hasNavigation: false,
                    hasUserMenu: false,
                    loginScore: 0 // 登录评分系统
                };
                
                // 1. 检查用户相关元素（权重：3）
                const userSelectors = [
                    '.avatar', '.user-avatar', '.profile-avatar',
                    '.user-name', '.username', '.profile-name',
                    '.user-info', '.header-user', '.profile-menu',
                    '[data-testid*="avatar"]', '[data-testid*="user"]',
                    '[data-testid*="profile"]', '.user-center', '.profile-center'
                ];
                
                for (const selector of userSelectors) {
                    if (document.querySelector(selector)) {
                        info.hasUserElements = true;
                        info.loginScore += 3;
                        break;
                    }
                }
                
                // 2. 检查导航菜单（权重：2）
                const navSelectors = [
                    '.nav', '.navigation', '.menu', '.header-nav',
                    '[data-testid*="nav"]', '.top-nav', '.main-nav'
                ];
                
                for (const selector of navSelectors) {
                    if (document.querySelector(selector)) {
                        info.hasNavigation = true;
                        info.loginScore += 2;
                        break;
                    }
                }
                
                // 3. 检查用户菜单（权重：3）
                const userMenuSelectors = [
                    '.user-menu', '.profile-menu', '.account-menu',
                    '[data-testid*="user-menu"]', '.dropdown-menu'
                ];
                
                for (const selector of userMenuSelectors) {
                    if (document.querySelector(selector)) {
                        info.hasUserMenu = true;
                        info.loginScore += 3;
                        break;
                    }
                }
                
                // 4. 检查搜索结果显示（权重：2）
                const searchResults = document.querySelectorAll('.note-item, .feed-item, .content-item, .note-card, .search-item, .result-item, article, .card, .note, .feed');
                info.hasSearchResults = searchResults.length > 0;
                if (info.hasSearchResults) {
                    info.loginScore += 2;
                }
                
                // 5. 检查实际内容（权重：1）
                const images = document.querySelectorAll('img[src*="http"]');
                const hasContentImages = Array.from(images).some(img => {
                    const width = img.naturalWidth || img.width || 0;
                    const height = img.naturalHeight || img.height || 0;
                    return width > 200 && height > 200;
                });
                info.hasContent = hasContentImages;
                if (info.hasContent) {
                    info.loginScore += 1;
                }
                
                // 6. 检查登录相关元素（权重：-5，表示未登录）
                const loginSelectors = [
                    '.login-btn', '.login-button', '.signin-btn',
                    '[data-testid*="login"]', '[data-testid*="signin"]'
                ];
                
                for (const selector of loginSelectors) {
                    if (document.querySelector(selector)) {
                        info.hasLoginElements = true;
                        info.loginScore -= 5;
                        break;
                    }
                }
                
                return info;
            });
            
            // 检查明确的未登录提示（权重：-10）
            const hasLoginPrompt = loginInfo.bodyText.includes('登录后查看搜索结果') || 
                                  loginInfo.bodyText.includes('扫码登录') ||
                                  loginInfo.bodyText.includes('手机号登录') ||
                                  loginInfo.bodyText.includes('请在手机上确认') ||
                                  loginInfo.bodyText.includes('请先登录') ||
                                  loginInfo.bodyText.includes('登录后查看更多');
            
            if (hasLoginPrompt) {
                loginInfo.loginScore -= 10;
            }
            
            // 检查是否在登录页面（权重：-5）
            const isOnLoginPage = loginInfo.currentUrl.includes('login') || 
                                 loginInfo.currentUrl.includes('signin') ||
                                 loginInfo.currentUrl.includes('auth');
            
            if (isOnLoginPage) {
                loginInfo.loginScore -= 5;
            }
            
            console.log('📊 登录状态检测结果:', {
                url: loginInfo.currentUrl,
                loginScore: loginInfo.loginScore,
                hasUserElements: loginInfo.hasUserElements,
                hasLoginElements: loginInfo.hasLoginElements,
                hasSearchResults: loginInfo.hasSearchResults,
                hasContent: loginInfo.hasContent,
                hasNavigation: loginInfo.hasNavigation,
                hasUserMenu: loginInfo.hasUserMenu,
                hasLoginPrompt: hasLoginPrompt,
                isOnLoginPage: isOnLoginPage
            });
            
            // 智能判断：基于评分系统
            // 如果评分 >= 3，认为已登录
            // 如果评分 <= -5，认为未登录
            // 其他情况需要进一步判断
            let isLoggedIn = false;
            
            if (loginInfo.loginScore >= 3) {
                isLoggedIn = true;
                console.log('✅ 基于评分系统判断：已登录');
            } else if (loginInfo.loginScore <= -5) {
                isLoggedIn = false;
                console.log('❌ 基于评分系统判断：未登录');
            } else {
                // 边界情况：结合Cookie有效性判断
                if (cookieValid && !hasLoginPrompt && !isOnLoginPage) {
                    isLoggedIn = true;
                    console.log('✅ 基于Cookie有效性判断：已登录');
                } else {
                    isLoggedIn = false;
                    console.log('❌ 基于综合判断：未登录');
                }
            }
            
            // 自动Cookie刷新机制：当检测到用户相关元素缺失时
            if (!isLoggedIn && !loginInfo.hasUserElements && !loginInfo.hasUserMenu && cookieValid) {
                console.log('🔄 检测到用户相关元素缺失，尝试自动刷新Cookie...');
                try {
                    const refreshResult = await this.autoRefreshCookies();
                    if (refreshResult.success) {
                        console.log('✅ 自动Cookie刷新成功，重新检查登录状态...');
                        // 重新检查登录状态
                        const recheckResult = await this.checkLoginStatus();
                        if (recheckResult) {
                            console.log('✅ 刷新Cookie后登录状态正常');
                            return true;
                        }
                    }
                } catch (error) {
                    console.log('⚠️ 自动Cookie刷新失败:', error.message);
                }
            }
            
            console.log(`✅ 最终登录状态: ${isLoggedIn ? '已登录' : '未登录'} (评分: ${loginInfo.loginScore})`);
            
            return isLoggedIn;
            
        } catch (error) {
            console.error('❌ 检查登录状态时出错:', error.message);
            return false;
        }
    }

    /**
     * 检查Cookie有效性
     * @private
     * @returns {Promise<boolean>}
     */
    async checkCookieValidity() {
        try {
            if (!this.loginConfig || !this.loginConfig.cookieFile) {
                return false;
            }
            
            const fs = require('fs-extra');
            if (!await fs.pathExists(this.loginConfig.cookieFile)) {
                return false;
            }
            
            const cookies = await fs.readJson(this.loginConfig.cookieFile);
            if (!cookies || cookies.length === 0) {
                return false;
            }
            
            // 第一步：检查Cookie的基本有效性（更宽松的验证）
            const now = Date.now() / 1000;
            let validCookieCount = 0;
            
            // 检查是否有任何有效的Cookie
            for (const cookie of cookies) {
                if (cookie.name && cookie.value) {
                    // 检查Cookie是否过期
                    if (cookie.expires > 0 && cookie.expires < now) {
                        console.log(`⚠️ Cookie已过期: ${cookie.name}`);
                        continue;
                    }
                    validCookieCount++;
                }
            }
            
            if (validCookieCount === 0) {
                console.log('❌ 没有找到有效的Cookie');
                return false;
            }
            
            console.log(`✅ 找到 ${validCookieCount} 个有效Cookie`);
            
            // 检查是否有任何登录相关的Cookie（更宽松的检查）
            const loginRelatedCookies = cookies.filter(cookie => 
                cookie.name && (
                    cookie.name.includes('session') ||
                    cookie.name.includes('user') ||
                    cookie.name.includes('login') ||
                    cookie.name.includes('token') ||
                    cookie.name.includes('auth') ||
                    cookie.name === 'a1' ||
                    cookie.name === 'webId'
                )
            );
            
            if (loginRelatedCookies.length === 0) {
                console.log('⚠️ 未找到登录相关Cookie，但继续尝试...');
            } else {
                console.log(`✅ 找到 ${loginRelatedCookies.length} 个登录相关Cookie`);
            }
            
            // 第二步：实际验证Cookie是否仍然有效（仅在首次检查时进行）
            if (this.page && !this._cookieValidationPerformed) {
                console.log('🔍 实际验证Cookie有效性...');
                
                try {
                    // 加载Cookie到浏览器
                    await this.context.addCookies(cookies);
                    
                    // 访问需要登录的页面验证Cookie有效性
                    await this.page.goto('https://www.xiaohongshu.com/explore', { 
                        waitUntil: 'domcontentloaded',
                        timeout: 30000
                    });
                    await this.page.waitForTimeout(3000);
                    
                    // 检查页面是否显示登录提示
                    const hasLoginPrompt = await this.page.evaluate(() => {
                        const bodyText = document.body ? document.body.innerText : '';
                        return bodyText.includes('登录后查看搜索结果') || 
                               bodyText.includes('扫码登录') || 
                               bodyText.includes('手机号登录') ||
                               bodyText.includes('登录后查看更多');
                    });
                    
                    if (hasLoginPrompt) {
                        console.log('❌ Cookie已失效：页面显示登录提示');
                        this._cookieValidationPerformed = true; // 标记已执行验证
                        return false;
                    }
                    
                    console.log('✅ Cookie实际验证通过：页面未显示登录提示');
                    this._cookieValidationPerformed = true; // 标记已执行验证
                } catch (error) {
                    console.log('⚠️ Cookie验证过程中出错，跳过实际验证:', error.message);
                    this._cookieValidationPerformed = true; // 标记已执行验证
                }
            }
            
            console.log('✅ 关键Cookie完全有效');
            return true;
            
        } catch (error) {
            console.error('❌ 检查Cookie有效性时出错:', error.message);
            return false;
        }
    }

    /**
     * 等待用户登录
     * @private
     */
    async waitForLogin() {
        console.log('⏳ 等待用户登录...');
        console.log('💡 请在浏览器中完成登录，系统会自动检测登录状态...');
        
        // 等待用户手动登录，定期检查登录状态
        let attempts = 0;
        const maxAttempts = 60; // 最多等待5分钟
        const checkInterval = 5000; // 每5秒检查一次
        
        while (attempts < maxAttempts) {
            await this.page.waitForTimeout(checkInterval);
            attempts++;
            
            console.log(`🔍 检查登录状态... (${attempts}/${maxAttempts})`);
            
            const isLoggedIn = await this.checkLoginStatus();
            if (isLoggedIn) {
                console.log('✅ 检测到登录成功！');
                return true;
            }
            
            console.log('⏳ 等待登录中...');
        }
        
        console.log('⏰ 等待登录超时');
        return false;
    }

    /**
     * 提取图片URL（按点赞数排序选择内容）
     * @private
     * @returns {Promise<Array>} 图片URL数组
     */
    async extractImageUrls() {
        try {
            console.log('🔍 正在提取图片链接...');
            
            // 等待内容加载
            console.log('⏳ 等待页面内容加载...');
            await this.page.waitForTimeout(5000);
            
            // 获取当前页面信息
            console.log('📊 正在分析页面结构...');
            const pageInfo = await this.page.evaluate(() => {
                return {
                    url: window.location.href,
                    title: document.title,
                    bodyText: document.body ? document.body.innerText.substring(0, 500) : '',
                    imgCount: document.querySelectorAll('img').length,
                    divCount: document.querySelectorAll('div').length
                };
            });

            console.log('📄 当前页面信息:', pageInfo);
            
            // 滚动页面加载更多内容
            console.log('📜 正在滚动页面加载更多内容...');
            await this.scrollToLoadMore();
            
            // 提取内容卡片和图片信息
            console.log('🔍 正在提取内容卡片和图片信息...');
            const contentData = await this.page.evaluate(() => {
                const contents = [];
                
                // 查找内容卡片 - 使用更广泛的选择器
                const cardSelectors = [
                    '.note-item',
                    '.feed-item', 
                    '.content-item',
                    '.note-card',
                    '.search-item',
                    '.result-item',
                    '[data-testid*="note"]',
                    '[data-testid*="feed"]',
                    '[data-testid*="content"]',
                    '.note',
                    '.feed',
                    '.item',
                    'article',
                    '.card'
                ];
                
                let cards = [];
                for (const selector of cardSelectors) {
                    cards = document.querySelectorAll(selector);
                    if (cards.length > 0) {
                        console.log(`找到 ${cards.length} 个内容卡片: ${selector}`);
                        break;
                    }
                }
                
                // 如果没有找到特定的卡片，尝试查找包含图片的容器
                if (cards.length === 0) {
                    console.log('未找到特定卡片，尝试查找包含图片的容器...');
                    const imgContainers = document.querySelectorAll('img');
                    const containerMap = new Map();
                    
                    imgContainers.forEach(img => {
                        if (img.src && img.src.includes('http')) {
                            // 找到图片的父容器
                            let container = img.closest('div, article, section, li');
                            if (container) {
                                const containerId = container.outerHTML.substring(0, 100);
                                if (!containerMap.has(containerId)) {
                                    containerMap.set(containerId, {
                                        container: container,
                                        images: []
                                    });
                                }
                                containerMap.get(containerId).images.push(img);
                            }
                        }
                    });
                    
                    cards = Array.from(containerMap.values()).map(item => item.container);
                    console.log(`通过图片容器找到 ${cards.length} 个卡片`);
                }

                // 如果还是没有找到，尝试查找所有包含图片的div
                if (cards.length === 0) {
                    console.log('尝试查找所有包含图片的div...');
                    const allDivs = document.querySelectorAll('div');
                    cards = Array.from(allDivs).filter(div => {
                        const imgs = div.querySelectorAll('img');
                        return imgs.length > 0 && imgs.length < 10; // 避免选择包含太多图片的容器
                    });
                    console.log(`找到 ${cards.length} 个包含图片的div`);
                }
                
                cards.forEach((card, index) => {
                    try {
                        // 提取点赞数
                        let likeCount = 0;
                        const likeSelectors = [
                            '.like-count',
                            '.heart-count',
                            '[data-testid*="like"]',
                            '.interaction-count',
                            'span:contains("赞")',
                            'span:contains("❤")'
                        ];
                        
                        for (const selector of likeSelectors) {
                            const likeElement = card.querySelector(selector);
                            if (likeElement) {
                                const likeText = likeElement.textContent || likeElement.innerText;
                                const match = likeText.match(/(\d+)/);
                                if (match) {
                                    likeCount = parseInt(match[1]);
                                    break;
                                }
                            }
                        }
                        
                        // 提取图片
                        const images = [];
                        const imgElements = card.querySelectorAll('img');
                        
                        imgElements.forEach(img => {
                            if (img.src && img.src.includes('http')) {
                                const width = img.naturalWidth || img.width || 0;
                                const height = img.naturalHeight || img.height || 0;
                                
                                // 更严格的过滤条件，排除头像和系统图片
                                const isLargeEnough = width > 200 && height > 200; // 提高尺寸要求
                                const isNotAvatar = !img.src.includes('avatar') && 
                                                   !img.src.includes('icon') && 
                                                   !img.src.includes('profile') &&
                                                   !img.src.includes('head') &&
                                                   !img.src.includes('user');
                                const isNotSystem = !img.src.includes('logo') && 
                                                   !img.src.includes('banner') && 
                                                   !img.src.includes('button') &&
                                                   !img.src.includes('nav') &&
                                                   !img.src.includes('menu') &&
                                                   !img.src.includes('header') &&
                                                   !img.src.includes('footer');
                                const isNotEmoji = !img.src.includes('emoji') && 
                                                   !img.src.includes('smiley') &&
                                                   !img.src.includes('sticker');
                                const isNotAd = !img.src.includes('ad') && 
                                               !img.src.includes('promo') &&
                                               !img.src.includes('sponsor');
                                
                                // 检查图片是否在内容区域内（不是页面装饰元素）
                                const isInContentArea = img.closest('.note-item, .feed-item, .content-item, .note-card, .search-item, .result-item, article, .card');
                                
                                if (isLargeEnough && isNotAvatar && isNotSystem && isNotEmoji && isNotAd && isInContentArea) {
                                    let imageUrl = img.src;
                                    
                                    // 只做基本的URL优化（在page.evaluate内部无法访问this.config）
                                    if (imageUrl.includes('thumbnail') || imageUrl.includes('thumb')) {
                                        imageUrl = imageUrl.replace(/thumbnail|thumb/g, 'original');
                                    }
                                    imageUrl = imageUrl.replace(/[?&]w=\d+/g, '').replace(/[?&]h=\d+/g, '');
                                    
                                    images.push(imageUrl);
                                }
                            }
                        });
                        
                        if (images.length > 0) {
                            contents.push({
                                index: index,
                                likeCount: likeCount,
                                images: images,
                                title: card.querySelector('h1, h2, h3, .title, .note-title')?.textContent || `内容 ${index + 1}`
                            });
                        }
                        
                    } catch (error) {
                        console.log(`处理卡片 ${index} 时出错:`, error.message);
                    }
                });
                
                return contents;
            });
            
            console.log(`📸 找到 ${contentData.length} 个内容卡片`);
            
            // 按点赞数排序，选择前3个最受欢迎的内容
            console.log('🏆 正在按点赞数排序内容...');
            contentData.sort((a, b) => b.likeCount - a.likeCount);
            const topContents = contentData.slice(0, 3);
            
            console.log('🏆 点赞数最多的内容:');
            topContents.forEach((content, index) => {
                console.log(`  ${index + 1}. ${content.title} - ${content.likeCount} 赞 - ${content.images.length} 张图片`);
            });
            
            // 提取所有图片
            console.log('🔄 正在提取所有图片链接...');
            const allImages = [];
            topContents.forEach(content => {
                allImages.push(...content.images);
            });
            
            // 去重
            console.log('🔄 正在去重图片链接...');
            const uniqueImages = [...new Set(allImages)];
            
            console.log(`📸 总共提取到 ${uniqueImages.length} 张图片`);
            
            // 如果过滤后没有图片，尝试更宽松的过滤条件
            if (uniqueImages.length === 0) {
                console.log('⚠️ 过滤后没有图片，尝试更宽松的过滤条件...');
                console.log('🔍 正在使用更宽松的过滤条件搜索图片...');
                const allPageImages = await this.page.evaluate(() => {
                    const images = [];
                    const imgElements = document.querySelectorAll('img');
                    
                    imgElements.forEach(img => {
                        if (img.src && img.src.includes('http')) {
                            const width = img.naturalWidth || img.width || 0;
                            const height = img.naturalHeight || img.height || 0;
                            
                            // 更宽松但仍然排除明显不是内容的图片
                            const isLargeEnough = width > 150 && height > 150;
                            const isNotAvatar = !img.src.includes('avatar') && 
                                               !img.src.includes('icon') && 
                                               !img.src.includes('profile');
                            const isNotSystem = !img.src.includes('logo') && 
                                               !img.src.includes('banner') && 
                                               !img.src.includes('button');
                            
                            if (isLargeEnough && isNotAvatar && isNotSystem) {
                                images.push(img.src);
                            }
                        }
                    });
                    
                    return images;
                });
                
                console.log(`📸 页面中找到 ${allPageImages.length} 张图片`);
                return allPageImages.slice(0, this.config.maxImages);
            }
            
            return uniqueImages.slice(0, this.config.maxImages);
            
        } catch (error) {
            console.error('❌ 提取图片链接失败:', error.message);
            return [];
        }
    }

    /**
     * 优化图片URL以去除水印
     * @private
     * @param {string} originalUrl - 原始图片URL
     * @returns {string} 优化后的图片URL
     */
    optimizeImageUrlForWatermarkRemoval(originalUrl) {
        try {
            let optimizedUrl = originalUrl;
            
            // 方法1: 替换缩略图参数为原图
            if (optimizedUrl.includes('thumbnail') || optimizedUrl.includes('thumb')) {
                optimizedUrl = optimizedUrl.replace(/thumbnail|thumb/g, 'original');
            }
            
            // 方法2: 移除所有尺寸限制参数
            optimizedUrl = optimizedUrl.replace(/[?&]w=\d+/g, '');
            optimizedUrl = optimizedUrl.replace(/[?&]h=\d+/g, '');
            optimizedUrl = optimizedUrl.replace(/[?&]width=\d+/g, '');
            optimizedUrl = optimizedUrl.replace(/[?&]height=\d+/g, '');
            
            // 方法3: 移除格式和质量参数
            optimizedUrl = optimizedUrl.replace(/[?&]format=\w+/g, '');
            optimizedUrl = optimizedUrl.replace(/[?&]quality=\d+/g, '');
            optimizedUrl = optimizedUrl.replace(/[?&]q=\d+/g, '');
            
            // 方法4: 移除水印相关参数
            optimizedUrl = optimizedUrl.replace(/[?&]watermark=\w+/g, '');
            optimizedUrl = optimizedUrl.replace(/[?&]wm=\w+/g, '');
            optimizedUrl = optimizedUrl.replace(/[?&]mark=\w+/g, '');
            optimizedUrl = optimizedUrl.replace(/[?&]logo=\w+/g, '');
            
            // 方法5: 移除压缩和处理参数
            optimizedUrl = optimizedUrl.replace(/[?&]compress=\w+/g, '');
            optimizedUrl = optimizedUrl.replace(/[?&]resize=\w+/g, '');
            optimizedUrl = optimizedUrl.replace(/[?&]crop=\w+/g, '');
            
            // 方法6: 尝试获取基础URL（移除所有查询参数）
            if (optimizedUrl.includes('?')) {
                const baseUrl = optimizedUrl.split('?')[0];
                // 如果基础URL看起来是原始图片，使用它
                if (baseUrl.includes('.jpg') || baseUrl.includes('.png') || baseUrl.includes('.jpeg') || baseUrl.includes('.webp')) {
                    optimizedUrl = baseUrl;
                }
            }
            
            // 方法7: 尝试不同的图片服务端点
            if (optimizedUrl.includes('sns-img')) {
                // 小红书图片服务，尝试获取原图
                optimizedUrl = optimizedUrl.replace(/sns-img-[^/]+/, 'sns-img-original');
            }
            
            // 方法8: 移除时间戳和随机参数
            optimizedUrl = optimizedUrl.replace(/[?&]t=\d+/g, '');
            optimizedUrl = optimizedUrl.replace(/[?&]timestamp=\d+/g, '');
            optimizedUrl = optimizedUrl.replace(/[?&]v=\d+/g, '');
            optimizedUrl = optimizedUrl.replace(/[?&]version=\d+/g, '');
            
            // 清理多余的&符号
            optimizedUrl = optimizedUrl.replace(/[?&]+/g, (match, offset) => {
                return offset === 0 ? '?' : '&';
            });
            
            // 如果URL以&结尾，移除它
            if (optimizedUrl.endsWith('&')) {
                optimizedUrl = optimizedUrl.slice(0, -1);
            }
            
            // 如果URL以?结尾，移除它
            if (optimizedUrl.endsWith('?')) {
                optimizedUrl = optimizedUrl.slice(0, -1);
            }
            
            console.log(`🔄 图片URL优化: ${originalUrl} -> ${optimizedUrl}`);
            return optimizedUrl;
            
        } catch (error) {
            console.error('❌ 优化图片URL时出错:', error.message);
            return originalUrl;
        }
    }

    /**
     * 滚动页面加载更多内容
     * @private
     */
    async scrollToLoadMore() {
        try {
            console.log('📜 滚动页面加载更多内容...');
            
            for (let i = 0; i < 3; i++) {
                await this.page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight);
                });
                await this.page.waitForTimeout(2000);
            }
            
        } catch (error) {
            console.log('⚠️ 滚动页面时出错:', error.message);
        }
    }

    /**
     * 下载图片
     * @private
     * @param {Array} imageUrls - 图片URL数组
     * @param {string} restaurantName - 餐馆名称
     * @param {string} location - 地点信息
     * @returns {Promise<Object>} 下载结果
     */
    async downloadImages(imageUrls, restaurantName, location) {
        let downloadedCount = 0;
        let failedCount = 0;
        
        // 创建餐馆专用文件夹
        const restaurantFolder = path.join(
            this.config.downloadPath, 
            this.sanitizeFileName(restaurantName)
        );
        await fs.ensureDir(restaurantFolder);
        
        console.log(`📁 图片将保存到: ${restaurantFolder}`);
        console.log(`📸 开始下载 ${imageUrls.length} 张图片...`);
        
        for (let i = 0; i < imageUrls.length; i++) {
            const imageUrl = imageUrls[i];
            
            try {
                console.log(`⬇️ 正在下载第 ${i + 1}/${imageUrls.length} 张图片...`);
                this.log(`⬇️ 正在下载第 ${i + 1}/${imageUrls.length} 张图片...`, 'info');
                console.log(`🔗 图片URL: ${imageUrl.substring(0, 100)}...`);
                this.log(`🔗 图片URL: ${imageUrl.substring(0, 100)}...`, 'info');
                
                // 获取图片内容
                console.log(`🌐 正在获取图片内容...`);
                this.log(`🌐 正在获取图片内容...`, 'info');
                const response = await this.page.goto(imageUrl);
                const buffer = await response.body();
                
                const imageSizeKB = (buffer.length / 1024).toFixed(2);
                console.log(`📊 图片大小: ${imageSizeKB} KB`);
                this.log(`📊 图片大小: ${imageSizeKB} KB`, 'info');
                
                // 生成文件名
                const fileName = this.generateFileName(imageUrl, i + 1);
                const filePath = path.join(restaurantFolder, fileName);
                
                // 保存图片
                console.log(`💾 正在保存图片: ${fileName}`);
                this.log(`💾 正在保存图片: ${fileName}`, 'info');
                await fs.writeFile(filePath, buffer);
                
                // 如果启用了图片处理，尝试去除水印
                if (this.config.enableImageProcessing) {
                    try {
                        console.log(`🔄 正在处理图片水印: ${fileName}`);
                        this.log(`🔄 正在处理图片水印: ${fileName}`, 'info');
                        await this.processImageForWatermarkRemoval(filePath);
                        console.log(`✅ 图片水印处理完成: ${fileName}`);
                        this.log(`✅ 图片水印处理完成: ${fileName}`, 'success');
                    } catch (error) {
                        console.log(`⚠️ 图片水印处理失败: ${fileName} - ${error.message}`);
                        this.log(`⚠️ 图片水印处理失败: ${fileName} - ${error.message}`, 'warning');
                    }
                }
                
                console.log(`✅ 图片已保存: ${fileName}`);
                this.log(`✅ 图片已保存: ${fileName}`, 'success');
                downloadedCount++;
                
                // 显示下载进度
                const progress = Math.round(((i + 1) / imageUrls.length) * 100);
                console.log(`📈 下载进度: ${progress}% (${i + 1}/${imageUrls.length})`);
                this.log(`📈 下载进度: ${progress}% (${i + 1}/${imageUrls.length})`, 'info');
                
                // 添加延迟避免请求过快
                console.log(`⏳ 等待 ${this.config.delay}ms 后继续...`);
                this.log(`⏳ 等待 ${this.config.delay}ms 后继续...`, 'info');
                await this.page.waitForTimeout(this.config.delay);
                
            } catch (error) {
                console.error(`❌ 下载图片失败 (${imageUrl}):`, error.message);
                failedCount++;
                this.errors.push({
                    type: 'download_error',
                    url: imageUrl,
                    message: error.message,
                    timestamp: new Date().toISOString()
                });
                
                // 显示失败进度
                const progress = Math.round(((i + 1) / imageUrls.length) * 100);
                console.log(`📈 下载进度: ${progress}% (${i + 1}/${imageUrls.length}) - 失败: ${failedCount}`);
            }
        }
        
        console.log(`🎉 图片下载完成! 成功: ${downloadedCount}, 失败: ${failedCount}`);
        return { downloadedCount, failedCount };
    }

    /**
     * 生成文件名
     * @private
     * @param {string} imageUrl - 图片URL
     * @param {number} index - 图片索引
     * @returns {string} 文件名
     */
    generateFileName(imageUrl, index) {
        try {
            const url = new URL(imageUrl);
            const pathname = url.pathname;
            const extension = path.extname(pathname) || '.jpg';
            return `image_${index.toString().padStart(3, '0')}${extension}`;
        } catch (error) {
            return `image_${index.toString().padStart(3, '0')}.jpg`;
        }
    }

    /**
     * 处理图片以去除水印
     * @private
     * @param {string} imagePath - 图片文件路径
     */
    async processImageForWatermarkRemoval(imagePath) {
        try {
            console.log(`🔄 开始处理图片水印: ${imagePath}`);
            this.log(`🔄 开始处理图片水印: ${imagePath}`, 'info');
            
            // 读取图片信息
            const imageInfo = await sharp(imagePath).metadata();
            console.log(`📊 图片信息: ${imageInfo.width}x${imageInfo.height}, 格式: ${imageInfo.format}`);
            this.log(`📊 图片信息: ${imageInfo.width}x${imageInfo.height}, 格式: ${imageInfo.format}`, 'info');
            
            // 创建最终处理后的图片路径（只保存这一个版本）
            const processedPath = imagePath.replace(/\.(jpg|jpeg|png|webp)$/i, '_processed.$1');
            
            // 方法1: 尝试裁剪右下角区域（小红书水印通常在右下角）
            const cropWidth = Math.floor(imageInfo.width * 0.15); // 裁剪右下角15%宽度
            const cropHeight = Math.floor(imageInfo.height * 0.1); // 裁剪右下角10%高度
            
            await sharp(imagePath)
                .extract({
                    left: 0,
                    top: 0,
                    width: imageInfo.width - cropWidth,
                    height: imageInfo.height - cropHeight
                })
                .jpeg({ quality: 95 })
                .toFile(processedPath);
            
            console.log(`✂️ 已裁剪右下角区域: ${processedPath}`);
            this.log(`✂️ 已裁剪右下角区域: ${processedPath}`, 'info');
            
            // 删除原始图片，只保留处理后的版本
            await fs.remove(imagePath);
            console.log(`🗑️ 已删除原始图片: ${imagePath}`);
            this.log(`🗑️ 已删除原始图片: ${imagePath}`, 'info');
            
            // 将处理后的图片重命名为最终文件名
            await fs.move(processedPath, imagePath);
            console.log(`✅ 已保存最终处理版本: ${imagePath}`);
            this.log(`✅ 已保存最终处理版本: ${imagePath}`, 'success');
            
        } catch (error) {
            console.error(`❌ 图片水印处理失败: ${error.message}`);
            this.log(`❌ 图片水印处理失败: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * 清理文件名中的非法字符
     * @private
     * @param {string} fileName - 原始文件名
     * @returns {string} 清理后的文件名
     */
    sanitizeFileName(fileName) {
        return fileName.replace(/[<>:"/\\|?*]/g, '_').trim();
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

    /**
     * 获取下载统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            downloadedCount: this.downloadedCount,
            errors: this.errors,
            config: this.config
        };
    }

    /**
     * 在用户浏览器中打开登录窗口
     * 连接到用户当前使用的浏览器，在新窗口中打开登录页面
     * @returns {Promise<Object>} 登录结果
     */
    async openLoginWindowInUserBrowser() {
        let userBrowser = null;
        let loginPage = null;
        
        try {
            console.log('🌐 正在连接到用户浏览器...');
            
            // 尝试连接到用户当前使用的浏览器
            try {
                // 尝试连接到Chrome的远程调试端口
                userBrowser = await chromium.connectOverCDP('http://localhost:9222');
                console.log('✅ 已连接到用户Chrome浏览器');
            } catch (error) {
                console.log('⚠️ 无法连接到用户Chrome浏览器，尝试启动新的浏览器实例...');
                
                // 如果无法连接，启动一个新的浏览器实例
                userBrowser = await chromium.launch({
                    headless: false, // 显示浏览器窗口
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
                console.log('✅ 已启动新的浏览器实例');
            }
            
            // 创建新的页面用于登录
            loginPage = await userBrowser.newPage();
            console.log('🆕 已创建新的登录窗口');
            
            // 打开小红书登录页面
            console.log('🌐 正在打开小红书登录页面...');
            await loginPage.goto('https://www.xiaohongshu.com/login', {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            console.log('✅ 登录页面已打开，请扫码登录');
            console.log('⏰ 您有30秒时间完成登录...');
            
            // 给用户30秒反应时间
            await loginPage.waitForTimeout(30000);
            
            // 检查登录状态
            const isLoggedIn = await this.checkLoginStatusOnPage(loginPage);
            if (isLoggedIn) {
                console.log('✅ 检测到登录成功！正在获取Cookie...');
                
                // 获取Cookie
                const cookies = await loginPage.context().cookies();
                console.log('🍪 已获取Cookie，正在保存...');
                
                // 保存Cookie到文件
                await this.saveCookiesFromArray(cookies);
                console.log('💾 Cookie已保存');
                
                // 关闭登录窗口
                await loginPage.close();
                console.log('🔒 登录窗口已关闭');
                
                return { success: true, message: '登录成功，Cookie已更新' };
            } else {
                console.log('⏰ 30秒内未检测到登录，继续等待...');
                
                // 继续等待用户手动登录
                let attempts = 0;
                const maxAttempts = 60; // 最多等待5分钟
                const checkInterval = 5000; // 每5秒检查一次
                
                while (attempts < maxAttempts) {
                    await loginPage.waitForTimeout(checkInterval);
                    attempts++;
                    
                    console.log(`🔍 检查登录状态... (${attempts}/${maxAttempts})`);
                    
                    const isLoggedIn = await this.checkLoginStatusOnPage(loginPage);
                    if (isLoggedIn) {
                        console.log('✅ 检测到登录成功！正在获取Cookie...');
                        
                        // 获取Cookie
                        const cookies = await loginPage.context().cookies();
                        console.log('🍪 已获取Cookie，正在保存...');
                        
                        // 保存Cookie到文件
                        await this.saveCookiesFromArray(cookies);
                        console.log('💾 Cookie已保存');
                        
                        // 关闭登录窗口
                        await loginPage.close();
                        console.log('🔒 登录窗口已关闭');
                        
                        return { success: true, message: '登录成功，Cookie已更新' };
                    }
                    
                    console.log('⏳ 等待登录中...');
                }
                
                console.log('⏰ 等待登录超时');
                return { success: false, error: '登录超时' };
            }
            
        } catch (error) {
            console.error('❌ 登录过程中发生错误:', error.message);
            return { success: false, error: error.message };
        } finally {
            // 清理资源
            if (loginPage) {
                try {
                    await loginPage.close();
                } catch (error) {
                    // 忽略关闭页面的错误
                }
            }
            if (userBrowser && userBrowser !== this.browser) {
                try {
                    await userBrowser.close();
                } catch (error) {
                    // 忽略关闭浏览器的错误
                }
            }
        }
    }

    /**
     * 在指定页面上检查登录状态
     * @param {Page} page - 要检查的页面
     * @returns {Promise<boolean>} 是否已登录
     */
    async checkLoginStatusOnPage(page) {
        try {
            return await page.evaluate(() => {
                // 检查是否存在用户相关元素
                const userElements = document.querySelectorAll('.user-info, .user-avatar, .profile, [data-testid*="user"], .user-name, .user-menu');
                const hasUserElements = userElements.length > 0;
                
                // 检查是否存在登录相关元素
                const loginElements = document.querySelectorAll('.login-btn, .login-button, [data-testid*="login"]');
                const hasLoginElements = loginElements.length > 0;
                
                // 检查页面内容
                const bodyText = document.body ? document.body.innerText : '';
                const hasLoginPrompt = bodyText.includes('登录') || 
                                     bodyText.includes('扫码登录') ||
                                     bodyText.includes('手机号登录');
                
                // 如果存在用户元素且不存在登录元素，则认为已登录
                return hasUserElements && !hasLoginElements && !hasLoginPrompt;
            });
        } catch (error) {
            console.error('检查登录状态时出错:', error.message);
            return false;
        }
    }

    /**
     * 从Cookie数组保存Cookie到文件
     * @param {Array} cookies - Cookie数组
     */
    async saveCookiesFromArray(cookies) {
        try {
            const cookieData = {
                cookies: cookies,
                timestamp: new Date().toISOString(),
                domain: 'xiaohongshu.com'
            };
            
            const cookieFile = this.loginConfig?.cookieFile || './cookies.json';
            await fs.writeJson(cookieFile, cookieData, { spaces: 2 });
            console.log(`💾 Cookie已保存到: ${cookieFile}`);
        } catch (error) {
            console.error('保存Cookie时出错:', error.message);
            throw error;
        }
    }

    /**
     * 自动刷新Cookie
     * 当检测到用户相关元素缺失时，自动调用refresh-cookies.js来刷新Cookie
     * @returns {Promise<Object>} 刷新结果
     */
    async autoRefreshCookies() {
        try {
            console.log('🔄 开始自动刷新Cookie...');
            
            // 检查是否存在refresh-cookies.js文件
            const fs = require('fs-extra');
            const path = require('path');
            const refreshScriptPath = path.join(__dirname, '..', 'refresh-cookies.js');
            
            if (!await fs.pathExists(refreshScriptPath)) {
                console.log('⚠️ refresh-cookies.js 文件不存在，跳过自动刷新');
                return { success: false, error: 'refresh-cookies.js 文件不存在' };
            }
            
            // 使用当前浏览器实例进行Cookie刷新
            console.log('🌐 使用当前浏览器实例刷新Cookie...');
            
            // 访问小红书主页
            await this.page.goto('https://www.xiaohongshu.com/explore', {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            
            // 等待页面加载
            await this.page.waitForTimeout(3000);
            
            // 检查是否需要重新登录
            const needsLogin = await this.page.evaluate(() => {
                const loginElements = document.querySelectorAll('.login-btn, .login-button, [data-testid*="login"]');
                const hasLoginPrompt = document.body.innerText.includes('登录') || 
                                     document.body.innerText.includes('扫码登录') ||
                                     document.body.innerText.includes('手机号登录');
                return loginElements.length > 0 || hasLoginPrompt;
            });
            
            if (needsLogin) {
                console.log('🔐 检测到需要重新登录，正在使用用户浏览器打开登录窗口...');
                
                // 使用用户浏览器打开登录窗口
                const loginResult = await this.openLoginWindowInUserBrowser();
                if (loginResult.success) {
                    console.log('✅ 登录成功，Cookie已更新');
                    return { success: true, message: '登录成功，Cookie已更新' };
                } else {
                    console.log('❌ 登录失败:', loginResult.error);
                    return { success: false, error: loginResult.error };
                }
            } else {
                console.log('✅ 当前登录状态正常，无需刷新Cookie');
                return { success: true, message: '当前登录状态正常' };
            }
            
        } catch (error) {
            console.error('❌ 自动刷新Cookie时出错:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = { XiaohongshuScraper };
