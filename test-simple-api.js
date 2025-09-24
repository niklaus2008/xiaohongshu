#!/usr/bin/env node

/**
 * 简单测试API响应
 */

const http = require('http');

function testAPI() {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/login/status',
        method: 'GET'
    };
    
    const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
            body += chunk;
        });
        res.on('end', () => {
            console.log('API响应:');
            console.log(body);
            
            try {
                const data = JSON.parse(body);
                console.log('\n解析后的数据:');
                console.log('success:', data.success);
                console.log('isLoggedIn:', data.data?.isLoggedIn);
                console.log('loginScore:', data.data?.loginScore);
                console.log('cookieInfo:', data.data?.cookieInfo);
            } catch (error) {
                console.log('解析JSON失败:', error.message);
            }
        });
    });
    
    req.on('error', (error) => {
        console.error('请求失败:', error.message);
    });
    
    req.end();
}

testAPI();
