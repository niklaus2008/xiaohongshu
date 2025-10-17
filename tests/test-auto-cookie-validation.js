/**
 * 测试自动Cookie验证功能
 */

async function testAutoCookieValidation() {
    try {
        console.log('🧪 开始测试自动Cookie验证功能...');
        
        // 等待服务启动
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 测试登录状态检查API（这会自动进行Cookie验证）
        console.log('📡 测试 /api/login/status API（自动Cookie验证）...');
        const statusResponse = await fetch('http://localhost:3000/api/login/status');
        const statusData = await statusResponse.json();
        
        console.log('✅ 登录状态API响应:', {
            success: statusData.success,
            isLoggedIn: statusData.data?.isLoggedIn,
            loginScore: statusData.data?.loginScore,
            cookieCount: statusData.data?.cookieInfo?.count
        });
        
        // 测试Cookie文件验证API
        console.log('📡 测试 /api/login/validate-file API...');
        const validateResponse = await fetch('http://localhost:3000/api/login/validate-file');
        const validateData = await validateResponse.json();
        
        console.log('✅ Cookie验证API响应:', {
            success: validateData.success,
            isValid: validateData.data?.isValid,
            score: validateData.data?.score,
            confidence: validateData.data?.confidence,
            cookieCount: validateData.data?.cookieCount
        });
        
        // 模拟前端自动检测流程
        console.log('🔄 模拟前端自动检测流程...');
        
        // 1. 检查基本登录状态
        const basicStatus = await fetch('http://localhost:3000/api/login/status');
        const basicResult = await basicStatus.json();
        
        if (basicResult.success && basicResult.data.isLoggedIn) {
            console.log('📊 基本登录状态正常，进行Cookie验证...');
            
            // 2. 进行Cookie验证
            const cookieValidation = await fetch('http://localhost:3000/api/login/validate-file');
            const validationResult = await cookieValidation.json();
            
            if (validationResult.success) {
                const validationData = validationResult.data;
                console.log('📊 Cookie验证结果:');
                console.log(`  - 有效性: ${validationData.isValid ? '✅ 有效' : '❌ 无效'}`);
                console.log(`  - 评分: ${validationData.score}/100`);
                console.log(`  - 置信度: ${Math.round(validationData.confidence * 100)}%`);
                console.log(`  - Cookie数量: ${validationData.cookieCount}`);
                
                if (validationData.isValid) {
                    console.log('🎉 自动Cookie验证成功！用户已登录状态');
                } else {
                    console.log('⚠️ Cookie验证失败，需要重新登录');
                }
            } else {
                console.log('❌ Cookie验证API调用失败');
            }
        } else {
            console.log('ℹ️ 基本登录状态显示未登录，跳过Cookie验证');
        }
        
        console.log('🎉 自动Cookie验证功能测试完成！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

// 运行测试
testAutoCookieValidation();
