#!/usr/bin/env node

/**
 * 测试登录窗口修复功能 v3
 * 验证前端调用后端API打开登录窗口的功能
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

async function testLoginWindowFixV3() {
    console.log('🧪 开始测试登录窗口修复功能 v3...');
    console.log('💡 这个测试会验证前端调用后端API打开登录窗口的功能');
    
    try {
        // 1. 测试重置登录窗口状态
        console.log('\n📡 步骤1: 测试重置登录窗口状态...');
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
            console.log('✅ 重置登录窗口状态成功');
        } else {
            console.log('❌ 重置登录窗口状态失败');
        }
        
        // 2. 测试通过API打开登录窗口
        console.log('\n📡 步骤2: 测试通过API打开登录窗口...');
        const openOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/open-browser',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const openData = {
            url: 'https://www.xiaohongshu.com/explore'
        };
        
        const openResponse = await makeRequest(openOptions, openData);
        if (openResponse.status === 200 && openResponse.data.success) {
            console.log('✅ 通过API打开登录窗口成功');
            console.log(`📝 响应消息: ${openResponse.data.message}`);
            console.log(`🔧 浏览器来源: ${openResponse.data.data?.browserSource || '未知'}`);
            console.log(`👤 是否用户浏览器: ${openResponse.data.data?.isUserBrowser || false}`);
            
            if (openResponse.data.existingWindow) {
                console.log('💡 检测到现有窗口，请检查浏览器是否可见');
            } else {
                console.log('💡 新窗口已创建，请检查是否有新的浏览器窗口打开');
            }
        } else {
            console.log('❌ 通过API打开登录窗口失败');
            console.log(`📝 错误信息: ${openResponse.data.error || '未知错误'}`);
        }
        
        // 3. 测试重复打开（应该被智能处理）
        console.log('\n📡 步骤3: 测试重复打开登录窗口...');
        const repeatResponse = await makeRequest(openOptions, openData);
        if (repeatResponse.status === 200) {
            if (repeatResponse.data.existingWindow) {
                console.log('✅ 智能处理重复打开请求成功');
                console.log('💡 系统检测到现有窗口，没有重复创建');
            } else {
                console.log('⚠️ 系统创建了新的登录窗口');
            }
        } else {
            console.log('❌ 重复打开请求处理失败');
        }
        
        // 4. 测试登录状态查询
        console.log('\n📡 步骤4: 测试登录状态查询...');
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
            console.log(`📊 登录评分: ${statusResponse.data.data.loginScore || 0}`);
        } else {
            console.log('❌ 登录状态查询失败');
        }
        
        console.log('\n🎉 测试完成！');
        console.log('💡 修复要点：');
        console.log('   1. 前端现在调用后端API而不是直接使用window.open()');
        console.log('   2. 后端API确保浏览器窗口可见性');
        console.log('   3. 智能处理重复打开请求');
        console.log('   4. 提供详细的用户指导');
        
        console.log('\n📋 使用说明：');
        console.log('   1. 启动Web服务器: npm run start:web');
        console.log('   2. 在浏览器中访问: http://localhost:3000');
        console.log('   3. 点击"登录小红书"按钮');
        console.log('   4. 系统会通过后端API打开登录窗口');
        console.log('   5. 如果看不到窗口，请按 Alt+Tab (Windows) 或 Cmd+Tab (Mac) 切换');
        
    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error.message);
        console.log('💡 请确保Web服务器正在运行 (npm run start:web)');
    }
}

// 运行测试
testLoginWindowFixV3();
