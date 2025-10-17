#!/usr/bin/env node

/**
 * 测试登录评分功能
 * 验证登录状态评分和界面显示
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

async function testLoginScore() {
    console.log('🧪 开始测试登录评分功能...');
    
    try {
        // 测试登录状态查询
        console.log('\n📡 测试登录状态查询...');
        const statusOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/login/status',
            method: 'GET'
        };
        
        const statusResponse = await makeRequest(statusOptions);
        
        if (statusResponse.status === 200 && statusResponse.data.success) {
            const data = statusResponse.data.data;
            console.log('✅ 登录状态查询成功');
            console.log(`📝 登录状态: ${data.isLoggedIn ? '已登录' : '未登录'}`);
            console.log(`📝 登录评分: ${data.loginScore}`);
            console.log(`📝 Cookie数量: ${data.cookieInfo?.count || 0}`);
            
            // 根据评分显示不同的状态
            if (data.loginScore > 0) {
                console.log('✅ 登录状态正常，可以开始下载');
            } else if (data.isLoggedIn) {
                console.log('⚠️ 登录状态评分过低，需要重新登录');
            } else {
                console.log('❌ 未登录，需要登录小红书');
            }
            
        } else {
            console.log('❌ 登录状态查询失败');
            console.log(`📝 错误信息: ${statusResponse.data.error || '未知错误'}`);
        }
        
        console.log('\n🎯 功能说明：');
        console.log('1. 登录评分 > 0：显示"已登录"，可以开始下载');
        console.log('2. 登录评分 <= 0：显示"登录状态评分过低"，需要重新登录');
        console.log('3. 未登录：显示"未登录"，需要登录小红书');
        console.log('4. 开始下载按钮会根据登录状态自动启用/禁用');
        
        console.log('\n💡 测试完成！');
        console.log('现在可以在Web界面中看到登录状态和评分信息');
        
    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error.message);
        console.log('💡 请确保Web服务器正在运行 (npm run start:web)');
    }
}

// 运行测试
testLoginScore();
