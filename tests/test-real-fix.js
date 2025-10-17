/**
 * 测试真正的修复效果
 * 验证修改后的登录状态检测逻辑
 */

const fs = require('fs-extra');
const path = require('path');

async function testRealFix() {
    console.log('🧪 测试真正的修复效果...\n');
    
    try {
        // 测试1：检查Cookie文件
        console.log('📋 测试1：检查Cookie文件');
        const cookieFile = './cookies.json';
        const cookieExists = await fs.pathExists(cookieFile);
        
        if (cookieExists) {
            const cookies = await fs.readJson(cookieFile);
            console.log(`✅ 找到 ${cookies.length} 个Cookie`);
            
            // 计算登录评分
            const now = Date.now() / 1000;
            const validCookies = cookies.filter(cookie => 
                !cookie.expires || cookie.expires > now
            );
            
            let loginScore = validCookies.length;
            
            // 加分：重要Cookie类型
            const loginCookies = validCookies.filter(cookie => 
                cookie.name.includes('session') || 
                cookie.name.includes('token') || 
                cookie.name.includes('user') ||
                cookie.name.includes('auth')
            );
            loginScore += loginCookies.length * 2;
            
            // 加分：小红书特有的Cookie
            const xiaohongshuCookies = validCookies.filter(cookie => 
                cookie.name.includes('xiaohongshu') ||
                cookie.name.includes('xhs') ||
                cookie.name.includes('web_session') ||
                cookie.name.includes('web_sessionid')
            );
            loginScore += xiaohongshuCookies.length * 3;
            
            loginScore = Math.min(10, loginScore);
            
            console.log(`📊 登录评分: ${loginScore}`);
            console.log(`📊 有效Cookie: ${validCookies.length}`);
            console.log(`📊 登录相关Cookie: ${loginCookies.length}`);
            console.log(`📊 小红书Cookie: ${xiaohongshuCookies.length}`);
            
            // 使用新的阈值判断
            const isLoggedIn = loginScore >= 2;
            console.log(`✅ 登录状态: ${isLoggedIn ? '已登录' : '未登录'} (阈值: 2)`);
            
            if (isLoggedIn) {
                console.log('🎉 修复成功！Cookie验证通过，无需重新登录');
            } else {
                console.log('⚠️ 登录评分仍然过低，可能需要进一步优化');
            }
            
        } else {
            console.log('❌ 未找到Cookie文件');
        }
        
        // 测试2：检查修改的文件
        console.log('\n📋 测试2：检查修改的文件');
        const filesToCheck = [
            'src/xiaohongshu-scraper.js',
            'src/web-interface.js'
        ];
        
        for (const file of filesToCheck) {
            const exists = await fs.pathExists(file);
            console.log(`${exists ? '✅' : '❌'} ${file}: ${exists ? '存在' : '不存在'}`);
        }
        
        // 测试3：检查关键修改
        console.log('\n📋 测试3：检查关键修改');
        const scraperContent = await fs.readFile('src/xiaohongshu-scraper.js', 'utf8');
        const webInterfaceContent = await fs.readFile('src/web-interface.js', 'utf8');
        
        // 检查xiaohongshu-scraper.js的修改
        if (scraperContent.includes('loginScore >= 2')) {
            console.log('✅ xiaohongshu-scraper.js: 登录评分阈值已降低到2');
        } else {
            console.log('❌ xiaohongshu-scraper.js: 登录评分阈值未正确修改');
        }
        
        if (scraperContent.includes('cookieScore >= 2')) {
            console.log('✅ xiaohongshu-scraper.js: 统一登录状态检测阈值已降低到2');
        } else {
            console.log('❌ xiaohongshu-scraper.js: 统一登录状态检测阈值未正确修改');
        }
        
        // 检查web-interface.js的修改
        if (webInterfaceContent.includes('loginScore >= 2')) {
            console.log('✅ web-interface.js: 登录评分阈值已降低到2');
        } else {
            console.log('❌ web-interface.js: 登录评分阈值未正确修改');
        }
        
        console.log('\n🎉 修复验证完成！');
        console.log('\n💡 使用建议:');
        console.log('1. 重启Web服务: npm run start:web');
        console.log('2. 测试批量下载功能');
        console.log('3. 如果仍有问题，请检查日志中的登录评分信息');
        
    } catch (error) {
        console.error('❌ 测试过程中出错:', error.message);
    }
}

// 如果直接运行此文件
if (require.main === module) {
    testRealFix();
}

module.exports = { testRealFix };
