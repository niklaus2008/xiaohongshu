/**
 * 测试修复后的Cookie有效性验证
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

async function testCookieValidation() {
    console.log('🧪 测试修复后的Cookie有效性验证...\n');
    
    const scraper = new XiaohongshuScraper({
        downloadPath: './test-cookie-validation-downloads',
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
        console.log('🔧 初始化浏览器...');
        await scraper.initBrowser();
        console.log('✅ 浏览器初始化完成\n');

        // 测试Cookie有效性验证
        console.log('🍪 测试Cookie有效性验证...');
        const cookieValid = await scraper.checkCookieValidity();
        
        if (cookieValid) {
            console.log('✅ Cookie验证通过：Cookie完全有效，可以直接使用\n');
            
            // 测试搜索功能验证登录状态
            console.log('🔍 测试搜索功能验证登录状态...');
            const result = await scraper.searchAndDownload('海底捞', '北京朝阳区');
            
            if (result) {
                console.log('✅ 搜索和下载成功：确认登录状态正常');
            } else {
                console.log('❌ 搜索和下载失败：登录状态可能有问题');
            }
        } else {
            console.log('❌ Cookie验证失败：Cookie已失效，需要重新登录\n');
            
            // 测试自动登录
            console.log('🔐 测试自动登录...');
            const loginResult = await scraper.autoLogin();
            
            if (loginResult) {
                console.log('✅ 自动登录成功');
            } else {
                console.log('❌ 自动登录失败');
            }
        }
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
    } finally {
        // 关闭浏览器
        console.log('\n🔚 关闭浏览器...');
        await scraper.close();
        console.log('✅ 测试完成');
    }
}

// 运行测试
testCookieValidation().catch(console.error);
