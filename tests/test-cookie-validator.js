/**
 * 测试Cookie验证功能
 */

async function testCookieValidator() {
    try {
        console.log('🧪 开始测试Cookie验证功能...');
        
        // 等待服务启动
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 测试验证Cookie文件API
        console.log('📡 测试 /api/login/validate-file API...');
        const response = await fetch('http://localhost:3000/api/login/validate-file');
        const data = await response.json();
        
        console.log('✅ API响应:', {
            status: response.status,
            success: data.success,
            data: data.data
        });
        
        if (data.success) {
            const result = data.data;
            console.log('📊 Cookie验证结果:');
            console.log(`  - 有效性: ${result.isValid ? '✅ 有效' : '❌ 无效'}`);
            console.log(`  - 评分: ${result.score}/100`);
            console.log(`  - 置信度: ${Math.round(result.confidence * 100)}%`);
            console.log(`  - Cookie数量: ${result.cookieCount}`);
            console.log(`  - 消息: ${result.message}`);
            
            if (result.details && result.details.indicators) {
                console.log(`  - 验证指标: ${result.details.indicators.join(', ')}`);
            }
        }
        
        console.log('🎉 Cookie验证功能测试完成！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

// 运行测试
testCookieValidator();
