/**
 * Cookie提取器 - 用于从当前浏览器中提取小红书Cookie
 * 这个脚本需要在用户登录小红书后运行
 */

class CookieExtractor {
    constructor() {
        this.init();
    }

    init() {
        // 检查是否在小红书页面
        if (window.location.hostname.includes('xiaohongshu.com')) {
            this.showExtractButton();
        }
    }

    showExtractButton() {
        // 创建提取按钮
        const extractBtn = document.createElement('button');
        extractBtn.id = 'extractCookieBtn';
        extractBtn.innerHTML = '📋 提取Cookie到下载工具';
        extractBtn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            background: #ff2442;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        
        extractBtn.addEventListener('click', () => {
            this.extractCookies();
        });
        
        document.body.appendChild(extractBtn);
    }

    extractCookies() {
        try {
            // 获取所有Cookie
            const cookies = document.cookie.split(';').map(cookie => {
                const [name, value] = cookie.trim().split('=');
                return {
                    name: name,
                    value: value,
                    domain: window.location.hostname,
                    path: '/',
                    expires: Date.now() / 1000 + 30 * 24 * 60 * 60 // 30天后过期
                };
            }).filter(cookie => cookie.name && cookie.value);

            if (cookies.length === 0) {
                alert('未找到Cookie，请确保已登录小红书');
                return;
            }

            // 发送Cookie到下载工具
            this.sendCookiesToDownloader(cookies);
            
        } catch (error) {
            console.error('提取Cookie失败:', error);
            alert('提取Cookie失败: ' + error.message);
        }
    }

    async sendCookiesToDownloader(cookies) {
        try {
            const response = await fetch('http://localhost:3000/api/login/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cookies })
            });

            const result = await response.json();
            
            if (result.success) {
                alert(`✅ Cookie已成功保存到下载工具！\n\n保存了 ${result.data.count} 个Cookie\n\n现在可以返回下载工具开始下载了。`);
                
                // 隐藏提取按钮
                const extractBtn = document.getElementById('extractCookieBtn');
                if (extractBtn) {
                    extractBtn.style.display = 'none';
                }
            } else {
                alert('❌ 保存Cookie失败: ' + result.error);
            }
        } catch (error) {
            console.error('发送Cookie失败:', error);
            alert('❌ 发送Cookie失败: ' + error.message + '\n\n请确保下载工具正在运行。');
        }
    }
}

// 自动初始化
if (window.location.hostname.includes('xiaohongshu.com')) {
    new CookieExtractor();
}
