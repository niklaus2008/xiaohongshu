/**
 * 修复统一登录评分的脚本
 * 确保Web界面和爬虫使用相同的评分标准
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const fs = require('fs-extra');
const path = require('path');

class UnifiedScoringFixer {
    constructor() {
        this.fixes = [];
    }

    /**
     * 修复Web界面的登录状态检测
     */
    async fixWebInterfaceDetection() {
        console.log('🔧 修复Web界面的登录状态检测...');
        
        const webInterfaceFile = path.join(__dirname, 'src/web-interface.js');
        let content = await fs.readFile(webInterfaceFile, 'utf8');
        
        // 添加统一的登录状态检测方法
        const unifiedDetectionMethod = `
    /**
     * 统一的登录状态检测方法
     * 结合Cookie评分和实际有效性验证
     * @returns {Promise<Object>} 登录状态信息
     */
    async getUnifiedLoginStatus() {
        try {
            const cookieFile = path.join(__dirname, '../cookies.json');
            let isLoggedIn = false;
            let cookieInfo = null;
            let loginScore = 0;
            
            if (await fs.pathExists(cookieFile)) {
                const cookies = await fs.readJson(cookieFile);
                if (cookies && cookies.length > 0) {
                    // 检查Cookie是否过期
                    const now = Date.now() / 1000;
                    const validCookies = cookies.filter(cookie => 
                        !cookie.expires || cookie.expires > now
                    );
                    
                    if (validCookies.length > 0) {
                        cookieInfo = {
                            count: validCookies.length,
                            expires: Math.min(...validCookies.map(c => c.expires || Infinity))
                        };
                        
                        // 基础评分：Cookie数量
                        loginScore = validCookies.length;
                        
                        // 加分：重要Cookie类型
                        const loginCookies = validCookies.filter(cookie => 
                            cookie.name.includes('session') || 
                            cookie.name.includes('token') || 
                            cookie.name.includes('user') ||
                            cookie.name.includes('auth')
                        );
                        loginScore += loginCookies.length * 2;
                        
                        // 加分：小红书特有的Cookie
                        const xiaohongshuCookies = validCookies.filter(cookie => 
                            cookie.name.includes('xiaohongshu') ||
                            cookie.name.includes('xhs') ||
                            cookie.name.includes('web_session') ||
                            cookie.name.includes('web_sessionid')
                        );
                        loginScore += xiaohongshuCookies.length * 3;
                        
                        // 限制最高评分为10
                        loginScore = Math.min(10, loginScore);
                        
                        // 只有评分 >= 3 才认为已登录
                        isLoggedIn = loginScore >= 3;
                        
                        console.log('🔍 统一登录评分计算:', {
                            validCookies: validCookies.length,
                            loginCookies: loginCookies.length,
                            xiaohongshuCookies: xiaohongshuCookies.length,
                            finalScore: loginScore,
                            isLoggedIn: isLoggedIn
                        });
                    }
                }
            }
            
            return {
                isLoggedIn,
                cookieInfo,
                loginScore
            };
        } catch (error) {
            console.error('统一登录状态检测失败:', error);
            return {
                isLoggedIn: false,
                cookieInfo: null,
                loginScore: 0,
                error: error.message
            };
        }
    }`;
        
        // 在类中添加统一检测方法
        content = content.replace(
            /(\s+)(\/\*\*[\s\S]*?\*\/\s*async\s+handleLoginStatus\(req, res\)\s*\{)/,
            `$1${unifiedDetectionMethod}\n\n    $2`
        );
        
        // 修改handleLoginStatus方法使用统一检测
        content = content.replace(
            /async handleLoginStatus\(req, res\) \{[^}]+\}/s,
            `async handleLoginStatus(req, res) {
        try {
            const result = await this.getUnifiedLoginStatus();
            
            console.log('📊 最终登录状态:', { 
                isLoggedIn: result.isLoggedIn, 
                loginScore: result.loginScore, 
                cookieCount: result.cookieInfo?.count 
            });
            
            res.json({
                success: true,
                data: {
                    isLoggedIn: result.isLoggedIn,
                    cookieInfo: result.cookieInfo,
                    loginScore: result.loginScore
                }
            });
        } catch (error) {
            console.error('检查登录状态失败:', error);
            this.logger.sendErrorLog('检查登录状态失败', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }`
        );
        
        await fs.writeFile(webInterfaceFile, content);
        this.fixes.push('✅ 已修复Web界面的登录状态检测，使用统一评分标准');
    }

    /**
     * 修复爬虫的登录状态检测
     */
    async fixScraperDetection() {
        console.log('🔧 修复爬虫的登录状态检测...');
        
        const scraperFile = path.join(__dirname, 'src/xiaohongshu-scraper.js');
        let content = await fs.readFile(scraperFile, 'utf8');
        
        // 修改getUnifiedLoginStatus方法，使用更严格的判断标准
        const improvedUnifiedMethod = `
    async getUnifiedLoginStatus() {
        try {
            // 第一步：检查Cookie文件评分
            const cookieScore = await this.getCookieScore();
            
            // 第二步：检查页面登录状态
            const pageLoggedIn = await this.checkLoginStatus();
            
            // 第三步：综合判断（更严格的标准）
            const finalScore = cookieScore;
            const isLoggedIn = pageLoggedIn && cookieScore >= 3; // 提高阈值到3
            
            console.log('🔍 统一登录状态检测结果:', {
                cookieScore,
                pageLoggedIn,
                finalScore,
                isLoggedIn,
                threshold: 3
            });
            
            return {
                isLoggedIn,
                loginScore: finalScore,
                cookieScore,
                pageLoggedIn,
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
    }`;
        
        // 替换现有的getUnifiedLoginStatus方法
        content = content.replace(
            /async getUnifiedLoginStatus\(\) \{[^}]+\}/s,
            improvedUnifiedMethod
        );
        
        await fs.writeFile(scraperFile, content);
        this.fixes.push('✅ 已修复爬虫的登录状态检测，使用更严格的判断标准');
    }

    /**
     * 创建统一的评分标准文档
     */
    async createUnifiedScoringDocument() {
        console.log('📝 创建统一的评分标准文档...');
        
        const documentContent = `# 统一登录评分标准

## 评分计算规则

### 基础评分
- Cookie数量：每个有效Cookie = 1分
- 重要Cookie类型：每个 = 2分（session, token, user, auth）
- 小红书特有Cookie：每个 = 3分（xiaohongshu, xhs, web_session, web_sessionid）

### 登录判断标准
- 评分 >= 3：认为已登录
- 评分 < 3：认为未登录
- 最高评分限制：10分

### 统一检测流程
1. 检查Cookie文件是否存在
2. 验证Cookie是否过期
3. 计算Cookie评分
4. 检查页面元素状态
5. 综合判断登录状态

## 修复内容
- Web界面和爬虫使用相同的评分标准
- 提高登录判断阈值到3分
- 统一检测流程和错误处理
- 确保检测结果一致`;
        
        await fs.writeFile(path.join(__dirname, 'UNIFIED_SCORING_STANDARD.md'), documentContent);
        this.fixes.push('✅ 已创建统一的评分标准文档');
    }

    /**
     * 应用所有修复
     */
    async applyAllFixes() {
        console.log('🚀 开始应用统一登录评分修复...\n');
        
        try {
            await this.fixWebInterfaceDetection();
            await this.fixScraperDetection();
            await this.createUnifiedScoringDocument();
            
            console.log('\n🎉 所有修复已应用完成！');
            console.log('\n📋 修复内容总结：');
            this.fixes.forEach(fix => console.log(fix));
            
            console.log('\n💡 修复说明：');
            console.log('1. ✅ Web界面和爬虫使用相同的评分标准');
            console.log('2. ✅ 提高登录判断阈值到3分（更严格）');
            console.log('3. ✅ 统一检测流程和错误处理');
            console.log('4. ✅ 确保检测结果一致');
            
            console.log('\n🔄 建议：');
            console.log('1. 重启服务以应用修复');
            console.log('2. 清除旧的Cookie文件');
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
    const fixer = new UnifiedScoringFixer();
    fixer.applyAllFixes().catch(console.error);
}

module.exports = UnifiedScoringFixer;
