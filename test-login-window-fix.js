#!/usr/bin/env node

/**
 * 测试登录窗口修复功能
 * 验证重置登录窗口状态API是否正常工作
 */

const http = require('http');

function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    resolve({ status: res.statusCode, data: result });
                } catch (error) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

async function testLoginWindowReset() {
    console.log('🧪 开始测试登录窗口重置功能...');
    
    try {
        // 测试重置登录窗口状态API
        console.log('📡 正在调用重置登录窗口状态API...');
        const resetOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/login/reset',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const resetResponse = await makeRequest(resetOptions);
        
        if (resetResponse.status === 200 && resetResponse.data.success) {
            console.log('✅ 重置登录窗口状态API调用成功');
            console.log(`📝 响应消息: ${resetResponse.data.message}`);
        } else {
            console.log('❌ 重置登录窗口状态API调用失败');
            console.log(`📝 错误信息: ${resetResponse.data.error || '未知错误'}`);
        }
        
        // 测试登录状态查询API
        console.log('\n📡 正在查询登录状态...');
        const statusOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/login/status',
            method: 'GET'
        };
        
        const statusResponse = await makeRequest(statusOptions);
        
        if (statusResponse.status === 200 && statusResponse.data.success) {
            console.log('✅ 登录状态查询成功');
            console.log(`📝 登录状态: ${statusResponse.data.data.isLoggedIn ? '已登录' : '未登录'}`);
            if (statusResponse.data.data.cookieInfo) {
                console.log(`📝 Cookie数量: ${statusResponse.data.data.cookieInfo.count}`);
            }
        } else {
            console.log('❌ 登录状态查询失败');
            console.log(`📝 错误信息: ${statusResponse.data.error || '未知错误'}`);
        }
        
        console.log('\n🎉 测试完成！');
        console.log('💡 如果看到"重置登录窗口状态API调用成功"，说明修复已生效');
        console.log('💡 现在可以在Web界面中看到"重置登录状态"按钮');
        
    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error.message);
        console.log('💡 请确保Web服务器正在运行 (npm run start:web)');
    }
}

// 运行测试
testLoginWindowReset();
