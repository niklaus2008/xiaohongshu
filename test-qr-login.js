/**
 * 测试优化后的扫码登录等待逻辑
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

async function testQrLogin() {
    console.log('🧪 测试优化后的扫码登录等待逻辑...\n');
    
    const scraper = new XiaohongshuScraper({
        downloadPath: './test-qr-downloads',
        maxImages: 1,
        headless: false, // 显示浏览器窗口
        delay: 1000,
        login: {
            method: 'qr',
            autoLogin: true,
            saveCookies: true,
            cookieFile: './cookies.json'
        }
    });

    try {
        // 初始化浏览器
        await scraper.initBrowser();
        
        // 测试登录功能
        console.log('🔐 开始测试扫码登录...');
        const loginResult = await scraper.login();
        
        if (loginResult) {
            console.log('✅ 登录成功！');
            
            // 测试搜索功能
            console.log('🔍 测试搜索功能...');
            const searchResult = await scraper.search('海底捞 北京朝阳区', 1);
            
            if (searchResult && searchResult.length > 0) {
                console.log('✅ 搜索成功！');
                console.log(`📊 找到 ${searchResult.length} 个结果`);
            } else {
                console.log('❌ 搜索失败');
            }
        } else {
            console.log('❌ 登录失败');
        }
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
    } finally {
        // 关闭浏览器
        await scraper.closeBrowser();
        console.log('🔚 测试完成');
    }
}

// 运行测试
testQrLogin().catch(console.error);
