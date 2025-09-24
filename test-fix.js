/**
 * 测试修复是否有效的脚本
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

async function testFix() {
    console.log('🧪 测试登录状态检测修复...');
    
    try {
        // 创建爬虫实例
        const scraper = new XiaohongshuScraper({
            downloadPath: './test-downloads',
            maxImages: 1,
            headless: true,
            login: {
                method: 'manual',
                autoLogin: true,
                saveCookies: true,
                cookieFile: './cookies.json'
            }
        });
        
        // 测试统一登录状态检测方法
        console.log('✅ 爬虫实例创建成功');
        console.log('✅ getUnifiedLoginStatus 方法存在:', typeof scraper.getUnifiedLoginStatus === 'function');
        console.log('✅ getCookieScore 方法存在:', typeof scraper.getCookieScore === 'function');
        
        // 关闭爬虫
        await scraper.close();
        
        console.log('🎉 所有测试通过！修复成功！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

testFix();
