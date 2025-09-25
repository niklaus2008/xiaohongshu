
/**
 * 测试修复效果
 */

const { forceCookieValidation } = require('./force-cookie-validation');

async function testFix() {
    console.log('🧪 测试修复效果...');
    
    const result = await forceCookieValidation();
    
    if (result.success) {
        console.log('✅ 修复成功！Cookie验证通过');
        console.log('💡 现在可以开始批量下载，无需重新登录');
    } else {
        console.log('❌ 修复失败:', result.error);
    }
}

if (require.main === module) {
    testFix();
}
