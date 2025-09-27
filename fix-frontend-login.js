#!/usr/bin/env node

/**
 * 修复前端登录窗口重复问题
 * 将前端的 openLoginModal() 方法修改为不调用 /api/open-browser API
 */

const fs = require('fs');
const path = require('path');

async function fixFrontendLogin() {
    console.log('🔧 正在修复前端登录窗口重复问题...');
    
    const appJsPath = path.join(__dirname, 'public/js/app.js');
    
    try {
        // 读取原始文件
        let content = await fs.promises.readFile(appJsPath, 'utf8');
        
        // 找到 openLoginModal 方法并替换
        const oldMethod = `    async openLoginModal() {
        // 防止重复打开登录窗口
        if (this.isLoginWindowOpen) {
            this.addLog('⚠️ 登录窗口已打开，请勿重复点击', 'warning');
            this.addLog('💡 如果看不到登录窗口，请点击"重置登录状态"按钮', 'info');
            return;
        }
        
        try {
            // 禁用登录按钮，防止重复点击
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>正在打开登录窗口...';
            }
            
            this.addLog('🌐 正在通过后端API打开登录窗口...', 'info');
            
            // 调用后端API打开登录窗口
            const response = await fetch('/api/open-browser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: 'https://www.xiaohongshu.com/explore'
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 标记登录窗口已打开
                this.isLoginWindowOpen = true;
                
                this.addLog('✅ 登录窗口已通过后端API打开', 'success');
                this.addLog('💡 请检查浏览器窗口，如果看不到请尝试以下方法：', 'info');
                this.addLog('   - 按 Alt+Tab (Windows) 或 Cmd+Tab (Mac) 切换窗口', 'info');
                this.addLog('   - 检查任务栏或Dock中的浏览器图标', 'info');
                this.addLog('   - 查看是否有新的浏览器窗口被打开', 'info');
                
                // 显示登录按钮状态
                if (loginBtn) {
                    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt me-1"></i>登录窗口已打开';
                }
                
                // 延迟检查登录状态
                setTimeout(() => {
                    this.addLog('💡 完成登录后，请点击"检查登录状态"按钮', 'info');
                }, 3000);
                
            } else {
                this.addLog(\`❌ 打开登录窗口失败: \${result.error || '未知错误'}\`, 'error');
                this.addLog('💡 请尝试点击"重置登录状态"按钮后重试', 'info');
                
                // 恢复登录按钮状态
                this.resetLoginButton();
            }
            
        } catch (error) {
            console.error('打开登录窗口失败:', error);
            this.addLog(\`❌ 打开登录窗口失败: \${error.message}\`, 'error');
            this.addLog('💡 请检查网络连接或尝试点击"重置登录状态"按钮', 'info');
            
            // 恢复登录按钮状态
            this.resetLoginButton();
        }
    }`;

        const newMethod = `    async openLoginModal() {
        // 防止重复打开登录窗口
        if (this.isLoginWindowOpen) {
            this.addLog('⚠️ 登录窗口已打开，请勿重复点击', 'warning');
            this.addLog('💡 如果看不到登录窗口，请点击"重置登录状态"按钮', 'info');
            return;
        }
        
        try {
            // 禁用登录按钮，防止重复点击
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>正在等待后端系统处理...';
            }
            
            this.addLog('🌐 后端系统正在自动处理登录，请稍候...', 'info');
            this.addLog('💡 如果后端系统检测到需要登录，会自动弹出登录窗口', 'info');
            this.addLog('⏳ 请等待后端系统完成登录处理...', 'info');
            
            // 不再调用后端API，让后端系统自动处理登录
            // 等待一段时间后重新检查登录状态
            setTimeout(() => {
                this.addLog('🔄 正在重新检查登录状态...', 'info');
                this.checkLoginStatus();
            }, 5000);
            
        } catch (error) {
            console.error('处理登录请求失败:', error);
            this.addLog(\`❌ 处理登录请求失败: \${error.message}\`, 'error');
            this.addLog('💡 请检查网络连接或尝试点击"重置登录状态"按钮', 'info');
            
            // 恢复登录按钮状态
            this.resetLoginButton();
        }
    }`;

        // 替换方法
        content = content.replace(oldMethod, newMethod);
        
        // 写回文件
        await fs.promises.writeFile(appJsPath, content, 'utf8');
        
        console.log('✅ 前端登录窗口重复问题已修复');
        console.log('📝 修改内容：');
        console.log('   - 移除了前端对 /api/open-browser 的调用');
        console.log('   - 改为提示用户等待后端系统自动处理');
        console.log('   - 确保只有后端系统在调用登录窗口');
        
    } catch (error) {
        console.error('❌ 修复失败:', error.message);
        throw error;
    }
}

// 运行修复
if (require.main === module) {
    fixFrontendLogin()
        .then(() => {
            console.log('🎉 修复完成！现在只会有一个登录窗口了。');
        })
        .catch(error => {
            console.error('修复失败:', error);
            process.exit(1);
        });
}

module.exports = fixFrontendLogin;
