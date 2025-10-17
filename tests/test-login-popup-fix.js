/**
 * 测试登录框重复弹出修复效果
 * 验证修复是否解决了用户扫码后重复弹出登录框的问题
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');
const globalLoginManager = require('./src/global-login-manager');

async function testLoginPopupFix() {
    console.log('🧪 开始测试登录框重复弹出修复效果...');
    
    try {
        // 创建爬虫实例
        const scraper = new XiaohongshuScraper({
            headless: false,
            browserType: 'chromium'
        });
        
        console.log('📊 测试全局状态管理器...');
        
        // 测试全局状态管理器
        const globalState = globalLoginManager.getGlobalState();
        console.log('全局状态:', globalState);
        
        // 测试登录冷却期功能
        console.log('🕐 测试登录冷却期功能...');
        globalLoginManager.setLoginCooldown(5000); // 5秒冷却期
        
        const stateAfterCooldown = globalLoginManager.getGlobalState();
        console.log('设置冷却期后的状态:', stateAfterCooldown);
        
        // 测试是否可以开始登录处理（应该被冷却期阻止）
        const canStart = globalLoginManager.canStartLoginProcess('test-instance');
        console.log('冷却期内是否可以开始登录处理:', canStart);
        
        // 等待冷却期结束
        console.log('⏳ 等待冷却期结束...');
        await new Promise(resolve => setTimeout(resolve, 6000));
        
        // 清除冷却期
        globalLoginManager.clearLoginCooldown();
        console.log('✅ 冷却期已清除');
        
        // 测试登录状态检测
        console.log('🔍 测试登录状态检测...');
        const loginStatus = await scraper.checkLoginStatus();
        console.log('登录状态:', loginStatus);
        
        if (loginStatus && loginStatus.loginScore <= 1) {
            console.log('⚠️ 登录状态评分过低，测试自动重新打开登录页面...');
            
            // 测试自动重新打开登录页面（但不实际执行，只测试逻辑）
            console.log('🔄 测试自动重新打开登录页面逻辑...');
            
            // 检查全局状态
            const globalState2 = globalLoginManager.getGlobalState();
            console.log('重新打开前的全局状态:', globalState2);
            
            // 模拟开始登录处理
            const canStart2 = globalLoginManager.canStartLoginProcess('test-instance-2');
            console.log('是否可以开始登录处理:', canStart2);
            
            if (canStart2) {
                console.log('✅ 可以开始登录处理，测试通过');
                
                // 模拟完成登录处理
                globalLoginManager.finishLoginProcess('test-instance-2', true);
                console.log('✅ 模拟登录处理完成');
            } else {
                console.log('❌ 无法开始登录处理，可能被冷却期或其他机制阻止');
            }
        } else {
            console.log('✅ 登录状态正常，无需重新打开登录页面');
        }
        
        // 清理
        await scraper.close();
        console.log('✅ 测试完成，爬虫实例已关闭');
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
    }
}

// 运行测试
if (require.main === module) {
    testLoginPopupFix().catch(console.error);
}

module.exports = { testLoginPopupFix };
