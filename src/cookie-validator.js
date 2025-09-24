/**
 * 轻量级Cookie验证器
 * 使用HTTP请求验证Cookie是否真正有效
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

class CookieValidator {
    constructor() {
        this.timeout = 10000; // 10秒超时
        this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }

    /**
     * 验证Cookie是否真正有效
     * @param {Array} cookies - Cookie数组
     * @param {string} targetUrl - 目标URL，默认为小红书探索页面
     * @returns {Promise<Object>} 验证结果
     */
    async validateCookies(cookies, targetUrl = 'https://www.xiaohongshu.com/explore') {
        try {
            console.log('🔍 开始轻量级Cookie验证...');
            
            if (!cookies || cookies.length === 0) {
                return {
                    isValid: false,
                    score: 0,
                    confidence: 0,
                    error: 'Cookie数组为空',
                    cookies: 0,
                    timestamp: new Date().toISOString()
                };
            }

            // 构建Cookie字符串
            const cookieString = this.buildCookieString(cookies);
            console.log(`✅ 已构建Cookie字符串，包含 ${cookies.length} 个Cookie`);

            // 发送HTTP请求验证
            const response = await this.sendValidationRequest(targetUrl, cookieString);
            
            // 分析响应内容
            const analysis = this.analyzeResponse(response);
            
            // 计算有效性评分
            const score = this.calculateValidityScore(analysis);
            
            const result = {
                isValid: analysis.hasUserInfo,
                score: score,
                confidence: analysis.confidence,
                details: analysis,
                cookies: cookies.length,
                responseSize: response.data ? response.data.length : 0,
                timestamp: new Date().toISOString()
            };

            console.log('📊 Cookie验证结果:', {
                isValid: result.isValid,
                score: result.score,
                confidence: result.confidence
            });

            return result;

        } catch (error) {
            console.error('❌ Cookie验证失败:', error.message);
            return {
                isValid: false,
                score: 0,
                confidence: 0,
                error: error.message,
                cookies: cookies ? cookies.length : 0,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 构建Cookie字符串
     * @param {Array} cookies - Cookie数组
     * @returns {string} Cookie字符串
     */
    buildCookieString(cookies) {
        return cookies
            .filter(cookie => cookie.name && cookie.value)
            .map(cookie => `${cookie.name}=${cookie.value}`)
            .join('; ');
    }

    /**
     * 发送验证请求
     * @param {string} url - 目标URL
     * @param {string} cookieString - Cookie字符串
     * @returns {Promise<Object>} 响应对象
     */
    async sendValidationRequest(url, cookieString) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'Cookie': cookieString,
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                },
                timeout: this.timeout,
                maxRedirects: 5,
                validateStatus: (status) => status < 500 // 接受4xx状态码
            });

            return response;
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                throw new Error('请求超时，请检查网络连接');
            } else if (error.response) {
                throw new Error(`HTTP错误: ${error.response.status} ${error.response.statusText}`);
            } else {
                throw new Error(`网络错误: ${error.message}`);
            }
        }
    }

    /**
     * 分析响应内容
     * @param {Object} response - HTTP响应
     * @returns {Object} 分析结果
     */
    analyzeResponse(response) {
        const data = response.data || '';
        const statusCode = response.status;
        
        const analysis = {
            statusCode: statusCode,
            hasUserInfo: false,
            hasLoginElements: false,
            hasNavigation: false,
            hasContent: false,
            confidence: 0,
            indicators: []
        };

        // 检查状态码
        if (statusCode >= 200 && statusCode < 300) {
            analysis.indicators.push('HTTP状态正常');
        } else if (statusCode >= 400 && statusCode < 500) {
            analysis.indicators.push('客户端错误，可能需要登录');
        }

        // 检查用户相关关键词
        const userKeywords = [
            'user', 'profile', 'avatar', 'username', 'nickname',
            '用户', '个人', '头像', '昵称', 'profile',
            'user-center', 'profile-center', 'account'
        ];
        
        const userMatches = userKeywords.filter(keyword => 
            data.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (userMatches.length > 0) {
            analysis.hasUserInfo = true;
            analysis.confidence += 0.3;
            analysis.indicators.push(`发现用户信息: ${userMatches.join(', ')}`);
        }

        // 检查登录相关元素（负分）
        const loginKeywords = [
            'login', 'sign-in', 'auth', '登录', '登陆',
            'login-btn', 'sign-in-btn', 'auth-btn'
        ];
        
        const loginMatches = loginKeywords.filter(keyword => 
            data.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (loginMatches.length > 0) {
            analysis.hasLoginElements = true;
            analysis.confidence -= 0.2;
            analysis.indicators.push(`发现登录元素: ${loginMatches.join(', ')}`);
        }

        // 检查导航元素
        const navKeywords = [
            'nav', 'navigation', 'menu', 'header', '导航', '菜单',
            'top-nav', 'main-nav', 'header-nav'
        ];
        
        const navMatches = navKeywords.filter(keyword => 
            data.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (navMatches.length > 0) {
            analysis.hasNavigation = true;
            analysis.confidence += 0.2;
            analysis.indicators.push(`发现导航元素: ${navMatches.join(', ')}`);
        }

        // 检查页面内容
        if (data.length > 1000) {
            analysis.hasContent = true;
            analysis.confidence += 0.1;
            analysis.indicators.push('页面内容丰富');
        }

        // 检查特定的小红书元素
        const xhsKeywords = [
            'xiaohongshu', '小红书', 'redbook', 'explore',
            'note', '笔记', 'user-center', 'profile'
        ];
        
        const xhsMatches = xhsKeywords.filter(keyword => 
            data.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (xhsMatches.length > 0) {
            analysis.confidence += 0.2;
            analysis.indicators.push(`发现小红书元素: ${xhsMatches.join(', ')}`);
        }

        return analysis;
    }

    /**
     * 计算有效性评分
     * @param {Object} analysis - 分析结果
     * @returns {number} 评分 (0-100)
     */
    calculateValidityScore(analysis) {
        let score = 0;

        // 基础评分
        if (analysis.statusCode >= 200 && analysis.statusCode < 300) {
            score += 20;
        }

        // 用户信息评分
        if (analysis.hasUserInfo) {
            score += 40;
        }

        // 导航元素评分
        if (analysis.hasNavigation) {
            score += 20;
        }

        // 内容评分
        if (analysis.hasContent) {
            score += 10;
        }

        // 负分项
        if (analysis.hasLoginElements) {
            score -= 30;
        }

        // 置信度调整
        score = Math.round(score * (0.5 + analysis.confidence));

        return Math.max(0, Math.min(100, score));
    }

    /**
     * 验证Cookie文件
     * @param {string} cookieFile - Cookie文件路径
     * @returns {Promise<Object>} 验证结果
     */
    async validateCookieFile(cookieFile) {
        try {
            console.log(`🔍 验证Cookie文件: ${cookieFile}`);
            
            if (!await fs.pathExists(cookieFile)) {
                return {
                    isValid: false,
                    score: 0,
                    confidence: 0,
                    error: 'Cookie文件不存在',
                    cookies: 0,
                    timestamp: new Date().toISOString()
                };
            }

            const cookies = await fs.readJson(cookieFile);
            if (!cookies || cookies.length === 0) {
                return {
                    isValid: false,
                    score: 0,
                    confidence: 0,
                    error: 'Cookie文件为空',
                    cookies: 0,
                    timestamp: new Date().toISOString()
                };
            }

            // 过滤有效Cookie
            const now = Date.now() / 1000;
            const validCookies = cookies.filter(cookie => 
                !cookie.expires || cookie.expires > now
            );

            if (validCookies.length === 0) {
                return {
                    isValid: false,
                    score: 0,
                    confidence: 0,
                    error: '所有Cookie已过期',
                    cookies: cookies.length,
                    timestamp: new Date().toISOString()
                };
            }

            console.log(`📊 过滤后有效Cookie: ${validCookies.length}/${cookies.length}`);
            return await this.validateCookies(validCookies);

        } catch (error) {
            console.error('验证Cookie文件失败:', error);
            return {
                isValid: false,
                score: 0,
                confidence: 0,
                error: error.message,
                cookies: 0,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 批量验证多个Cookie文件
     * @param {Array} cookieFiles - Cookie文件路径数组
     * @returns {Promise<Array>} 验证结果数组
     */
    async validateMultipleCookieFiles(cookieFiles) {
        const results = [];
        
        for (const file of cookieFiles) {
            try {
                const result = await this.validateCookieFile(file);
                results.push({
                    file: file,
                    ...result
                });
            } catch (error) {
                results.push({
                    file: file,
                    isValid: false,
                    score: 0,
                    confidence: 0,
                    error: error.message,
                    cookies: 0,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        return results;
    }
}

module.exports = CookieValidator;
