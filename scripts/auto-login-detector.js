/**
 * 自动登录检测器
 * 提供多种自动检测登录状态的方法
 */

class AutoLoginDetector {
    constructor() {
        this.detectionMethods = [
            'localStorage',
            'sessionStorage', 
            'cookie',
            'network'
        ];
    }

    /**
     * 自动检测登录状态
     * @returns {Promise<Object>} 检测结果
     */
    async detectLoginStatus() {
        console.log('🔍 开始自动检测登录状态...');
        
        for (const method of this.detectionMethods) {
            try {
                const result = await this[`detectBy${method.charAt(0).toUpperCase() + method.slice(1)}`]();
                if (result.success) {
                    console.log(`✅ 通过${method}方法检测到登录状态`);
                    return result;
                }
            } catch (error) {
                console.warn(`⚠️ ${method}方法检测失败:`, error.message);
            }
        }
        
        return {
            success: false,
            message: '所有自动检测方法都失败了'
        };
    }

    /**
     * 通过localStorage检测
     */
    async detectByLocalStorage() {
        // 检查是否有用户相关的localStorage数据
        const userKeys = Object.keys(localStorage).filter(key => 
            key.includes('user') || key.includes('login') || key.includes('session')
        );
        
        if (userKeys.length > 0) {
            return {
                success: true,
                method: 'localStorage',
                data: { keys: userKeys }
            };
        }
        
        return { success: false };
    }

    /**
     * 通过sessionStorage检测
     */
    async detectBySessionStorage() {
        // 检查是否有用户相关的sessionStorage数据
        const userKeys = Object.keys(sessionStorage).filter(key => 
            key.includes('user') || key.includes('login') || key.includes('session')
        );
        
        if (userKeys.length > 0) {
            return {
                success: true,
                method: 'sessionStorage',
                data: { keys: userKeys }
            };
        }
        
        return { success: false };
    }

    /**
     * 通过Cookie检测
     */
    async detectByCookie() {
        // 检查是否有用户相关的Cookie
        const cookies = document.cookie.split(';').map(cookie => {
            const [name, value] = cookie.trim().split('=');
            return { name, value };
        });
        
        const userCookies = cookies.filter(cookie => 
            cookie.name.includes('user') || 
            cookie.name.includes('login') || 
            cookie.name.includes('session') ||
            cookie.name.includes('token')
        );
        
        if (userCookies.length > 0) {
            return {
                success: true,
                method: 'cookie',
                data: { cookies: userCookies }
            };
        }
        
        return { success: false };
    }

    /**
     * 通过网络请求检测
     */
    async detectByNetwork() {
        try {
            // 尝试访问需要登录的API端点
            const response = await fetch('/api/login/status');
            const result = await response.json();
            
            if (result.success && result.data.isLoggedIn) {
                return {
                    success: true,
                    method: 'network',
                    data: result.data
                };
            }
            
            return { success: false };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * 智能登录检测
     * 结合多种方法进行检测
     */
    async smartDetect() {
        console.log('🧠 开始智能登录检测...');
        
        // 首先检查网络状态
        const networkResult = await this.detectByNetwork();
        if (networkResult.success) {
            return networkResult;
        }
        
        // 然后检查本地存储
        const localResult = await this.detectByLocalStorage();
        if (localResult.success) {
            return localResult;
        }
        
        // 最后检查Cookie
        const cookieResult = await this.detectByCookie();
        if (cookieResult.success) {
            return cookieResult;
        }
        
        return {
            success: false,
            message: '未检测到任何登录状态'
        };
    }
}

// 导出检测器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AutoLoginDetector };
} else {
    window.AutoLoginDetector = AutoLoginDetector;
}
