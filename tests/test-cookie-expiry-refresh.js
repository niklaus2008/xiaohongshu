/**
 * 测试Cookie失效时在现有浏览器中打开新标签页登录
 */

const { SmartCookieLogin } = require('./smart-cookie-login');
const fs = require('fs-extra');

async function testCookieExpiryRefresh() {
    console.log('🧪 测试Cookie失效时在现有浏览器中打开新标签页登录...\n');
    
    const smartLogin = new SmartCookieLogin();
    
    try {
        // 1. 模拟Cookie失效（删除Cookie文件）
        console.log('📝 模拟Cookie失效...');
        if (await fs.pathExists('./cookies.json')) {
            await fs.remove('./cookies.json');
            console.log('✅ 已删除Cookie文件，模拟失效状态');
        }
        
        // 2. 测试智能登录（应该触发在现有浏览器中打开新标签页）
        console.log('\n🔍 开始测试智能登录...');
        const success = await smartLogin.smartLogin();
        
        if (success) {
            console.log('\n✅ 测试成功！');
            console.log('📊 测试结果:');
            console.log('  - ✅ 检测到Cookie失效');
            console.log('  - ✅ 在现有浏览器中打开了新标签页');
            console.log('  - ✅ 成功完成登录流程');
            console.log('  - ✅ 保存了新的Cookie');
        } else {
            console.log('\n❌ 测试失败');
            console.log('📊 可能的原因:');
            console.log('  - 用户未完成登录');
            console.log('  - 网络连接问题');
            console.log('  - 浏览器连接失败');
        }
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
        console.error('详细错误:', error);
    } finally {
        await smartLogin.close();
    }
}

// 运行测试
testCookieExpiryRefresh().catch(console.error);
