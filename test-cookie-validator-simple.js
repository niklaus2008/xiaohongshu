/**
 * 简单测试Cookie验证器
 */

const CookieValidator = require('./src/cookie-validator');

async function testCookieValidator() {
    try {
        console.log('🧪 开始测试Cookie验证器...');
        
        const validator = new CookieValidator();
        
        // 测试空的Cookie数组
        console.log('📡 测试空Cookie数组...');
        const emptyResult = await validator.validateCookies([]);
        console.log('✅ 空Cookie结果:', emptyResult);
        
        // 测试无效的Cookie
        console.log('📡 测试无效Cookie...');
        const invalidCookies = [
            { name: 'test', value: 'invalid', domain: 'example.com' }
        ];
        const invalidResult = await validator.validateCookies(invalidCookies);
        console.log('✅ 无效Cookie结果:', invalidResult);
        
        console.log('🎉 Cookie验证器测试完成！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error('错误堆栈:', error.stack);
    }
}

// 运行测试
testCookieValidator();
