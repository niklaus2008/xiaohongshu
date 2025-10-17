
/**
 * 强制Cookie验证机制
 * 绕过所有验证，直接使用现有Cookie
 */

const fs = require('fs-extra');
const path = require('path');

class ForceCookieValidation {
    constructor() {
        this.cookieFile = './cookies.json';
    }

    /**
     * 强制验证Cookie
     */
    async validateCookies() {
        try {
            if (await fs.pathExists(this.cookieFile)) {
                const cookies = await fs.readJson(this.cookieFile);
                console.log('✅ 强制使用现有Cookie，跳过所有验证');
                console.log(`📦 使用 ${cookies.length} 个Cookie`);
                return { success: true, cookies: cookies };
            } else {
                console.log('❌ 未找到Cookie文件');
                return { success: false, error: '未找到Cookie文件' };
            }
        } catch (error) {
            console.error('❌ 强制Cookie验证失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 强制登录状态检测
     */
    async checkLoginStatus() {
        try {
            const result = await this.validateCookies();
            if (result.success) {
                console.log('✅ 强制登录状态检测：已登录');
                return true;
            } else {
                console.log('❌ 强制登录状态检测：未登录');
                return false;
            }
        } catch (error) {
            console.error('❌ 强制登录状态检测失败:', error.message);
            return false;
        }
    }
}

module.exports = { ForceCookieValidation };
