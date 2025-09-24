/**
 * 修复登录评分不一致问题的脚本
 * 解决Web界面显示10分但爬虫运行时显示0分的问题
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const fs = require('fs-extra');
const path = require('path');

class LoginScoringFixer {
    constructor() {
        this.fixes = [];
    }

    /**
     * 修复Cookie加载错误
     */
    async fixCookieLoadingError() {
        console.log('🔧 修复Cookie加载错误...');
        
        const scraperFile = path.join(__dirname, 'src/xiaohongshu-scraper.js');
        let content = await fs.readFile(scraperFile, 'utf8');
        
        // 修复this.context错误
        content = content.replace(
            /await this\.context\.addCookies\(cookies\);/g,
            'await this.page.context().addCookies(cookies);'
        );
        
        await fs.writeFile(scraperFile, content);
        this.fixes.push('✅ 已修复Cookie加载错误');
    }

    /**
     * 统一登录状态检测逻辑
     */
    async unifyLoginStatusDetection() {
        console.log('🔧 统一登录状态检测逻辑...');
        
        const scraperFile = path.join(__dirname, 'src/xiaohongshu-scraper.js');
        let content = await fs.readFile(scraperFile, 'utf8');
        
        // 添加统一的登录状态检测方法
        const unifiedDetectionMethod = `
    /**
     * 统一的登录状态检测方法
     * 结合Cookie评分和页面元素检测
     * @returns {Promise<Object>} 登录状态信息
     */
    async getUnifiedLoginStatus() {
        try {
            // 第一步：检查Cookie文件评分
            const cookieScore = await this.getCookieScore();
            
            // 第二步：检查页面元素状态
            const pageStatus = await this.checkPageLoginStatus();
            
            // 第三步：综合判断
            const finalScore = Math.max(cookieScore, pageStatus.loginScore);
            const isLoggedIn = finalScore > 0 && pageStatus.hasUserElements;
            
            return {
                isLoggedIn,
                loginScore: finalScore,
                cookieScore,
                pageStatus,
                unified: true
            };
        } catch (error) {
            console.error('统一登录状态检测失败:', error);
            return {
                isLoggedIn: false,
                loginScore: 0,
                error: error.message,
                unified: true
            };
        }
    }

    /**
     * 获取Cookie评分
     * @returns {Promise<number>} Cookie评分
     */
    async getCookieScore() {
        try {
            if (!this.loginConfig.cookieFile) {
                return 0;
            }
            
            const cookies = await fs.readJson(this.loginConfig.cookieFile);
            if (!cookies || cookies.length === 0) {
                return 0;
            }
            
            const now = Date.now() / 1000;
            const validCookies = cookies.filter(cookie => 
                !cookie.expires || cookie.expires > now
            );
            
            if (validCookies.length === 0) {
                return 0;
            }
            
            // 基础评分：Cookie数量
            let score = validCookies.length;
            
            // 加分：重要Cookie类型
            const loginCookies = validCookies.filter(cookie => 
                cookie.name.includes('session') || 
                cookie.name.includes('token') || 
                cookie.name.includes('user') ||
                cookie.name.includes('auth')
            );
            score += loginCookies.length * 2;
            
            // 加分：小红书特有Cookie
            const xiaohongshuCookies = validCookies.filter(cookie => 
                cookie.name.includes('xiaohongshu') ||
                cookie.name.includes('xhs') ||
                cookie.name.includes('web_session') ||
                cookie.name.includes('web_sessionid')
            );
            score += xiaohongshuCookies.length * 3;
            
            return Math.min(10, score);
        } catch (error) {
            console.error('获取Cookie评分失败:', error);
            return 0;
        }
    }`;
        
        // 在类中添加统一检测方法
        content = content.replace(
            /(\s+)(\/\*\*[\s\S]*?\*\/\s*async\s+checkLoginStatus\(\)\s*\{)/,
            `$1${unifiedDetectionMethod}\n\n    $2`
        );
        
        await fs.writeFile(scraperFile, content);
        this.fixes.push('✅ 已添加统一登录状态检测方法');
    }

    /**
     * 改进Cookie验证机制
     */
    async improveCookieValidation() {
        console.log('🔧 改进Cookie验证机制...');
        
        const scraperFile = path.join(__dirname, 'src/xiaohongshu-scraper.js');
        let content = await fs.readFile(scraperFile, 'utf8');
        
        // 改进Cookie验证逻辑
        const improvedValidation = `
    /**
     * 改进的Cookie验证方法
     * @param {Array} cookies - Cookie数组
     * @returns {Promise<boolean>} 验证结果
     */
    async validateCookiesImproved(cookies) {
        try {
            if (!this.page || !this.page.context()) {
                console.log('⚠️ 浏览器实例未初始化，跳过Cookie验证');
                return false;
            }
            
            // 确保Cookie正确加载
            await this.page.context().addCookies(cookies);
            console.log('✅ 已加载 ' + cookies.length + ' 个Cookie到浏览器实例');
            
            // 访问页面验证Cookie有效性
            await this.page.goto('https://www.xiaohongshu.com/explore', { 
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            await this.page.waitForTimeout(3000);
            
            // 检查登录状态
            const loginStatus = await this.checkPageLoginStatus();
            
            if (loginStatus.hasUserElements && loginStatus.loginScore > 0) {
                console.log('✅ Cookie验证成功：检测到用户元素');
                return true;
            } else {
                console.log('⚠️ Cookie验证失败：未检测到用户元素');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Cookie验证过程中出错:', error.message);
            return false;
        }
    }`;
        
        // 添加改进的验证方法
        content = content.replace(
            /(\s+)(\/\*\*[\s\S]*?\*\/\s*async\s+validateCookies\(\)\s*\{)/,
            `$1${improvedValidation}\n\n    $2`
        );
        
        await fs.writeFile(scraperFile, content);
        this.fixes.push('✅ 已改进Cookie验证机制');
    }

    /**
     * 修复登录状态检测调用
     */
    async fixLoginStatusCalls() {
        console.log('🔧 修复登录状态检测调用...');
        
        const scraperFile = path.join(__dirname, 'src/xiaohongshu-scraper.js');
        let content = await fs.readFile(scraperFile, 'utf8');
        
        // 将checkLoginStatus调用替换为getUnifiedLoginStatus
        content = content.replace(
            /const\s+isLoggedIn\s*=\s*await\s+this\.checkLoginStatus\(\);/g,
            'const loginStatus = await this.getUnifiedLoginStatus();\n            const isLoggedIn = loginStatus.isLoggedIn;'
        );
        
        await fs.writeFile(scraperFile, content);
        this.fixes.push('✅ 已修复登录状态检测调用');
    }

    /**
     * 应用所有修复
     */
    async applyAllFixes() {
        console.log('🚀 开始修复登录评分不一致问题...\n');
        
        try {
            await this.fixCookieLoadingError();
            await this.unifyLoginStatusDetection();
            await this.improveCookieValidation();
            await this.fixLoginStatusCalls();
            
            console.log('\n🎉 所有修复已应用完成！');
            console.log('\n📋 修复内容总结：');
            this.fixes.forEach(fix => console.log(fix));
            
            console.log('\n💡 修复说明：');
            console.log('1. ✅ 修复了Cookie加载错误（this.context -> this.page.context()）');
            console.log('2. ✅ 统一了登录状态检测逻辑（结合Cookie评分和页面元素）');
            console.log('3. ✅ 改进了Cookie验证机制（确保Cookie正确应用到浏览器）');
            console.log('4. ✅ 修复了登录状态检测调用（使用统一检测方法）');
            
            console.log('\n🔄 建议：');
            console.log('1. 重启服务以应用修复');
            console.log('2. 清除浏览器缓存和Cookie文件');
            console.log('3. 重新登录小红书');
            console.log('4. 测试登录状态检测是否一致');
            
        } catch (error) {
            console.error('❌ 修复过程中发生错误:', error.message);
            throw error;
        }
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const fixer = new LoginScoringFixer();
    fixer.applyAllFixes().catch(console.error);
}

module.exports = LoginScoringFixer;
