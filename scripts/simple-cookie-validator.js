/**
 * 简单的Cookie验证工具
 * 直接保存Cookie，不进行复杂的浏览器验证
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * 验证并保存Cookie
 * @param {Array} cookies - Cookie数组
 * @returns {Object} 验证结果
 */
async function validateAndSaveCookies(cookies) {
    try {
        console.log(`🔍 开始处理 ${cookies.length} 个Cookie...`);
        
        // 检查Cookie数量
        if (cookies.length === 0) {
            return {
                success: false,
                message: '没有找到Cookie'
            };
        }
        
        // 检查Cookie格式
        const validCookies = cookies.filter(cookie => {
            return cookie.name && cookie.value && cookie.name.trim() !== '';
        });
        
        if (validCookies.length === 0) {
            return {
                success: false,
                message: '没有找到有效的Cookie'
            };
        }
        
        console.log(`📋 找到 ${validCookies.length} 个有效Cookie`);
        
        // 保存Cookie到文件
        const cookieFile = path.join(__dirname, 'cookies.json');
        await fs.writeJson(cookieFile, validCookies, { spaces: 2 });
        
        console.log(`✅ 已保存 ${validCookies.length} 个Cookie到文件: ${cookieFile}`);
        
        return {
            success: true,
            message: 'Cookie已保存',
            data: {
                count: validCookies.length,
                file: cookieFile
            }
        };
        
    } catch (error) {
        console.error('❌ 保存Cookie失败:', error);
        return {
            success: false,
            message: `保存Cookie失败: ${error.message}`
        };
    }
}

module.exports = { validateAndSaveCookies };
