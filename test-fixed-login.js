/**
 * 测试修复后的登录逻辑
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

async function testFixedLogin() {
    console.log('🧪 测试修复后的登录逻辑...\n');
    
    const scraper = new XiaohongshuScraper({
        downloadPath: './test-fixed-login-downloads',
        maxImages: 2, // 只下载2张图片进行测试
        headless: false, // 显示浏览器窗口
        delay: 2000,
        login: {
            method: 'qr', // 如果Cookie失效，使用扫码登录
            autoLogin: true,
            saveCookies: true,
            cookieFile: './cookies.json'
        }
    });

    try {
        console.log('🔧 初始化浏览器...');
        await scraper.initBrowser();
        console.log('✅ 浏览器初始化完成\n');

        console.log('🍪 检查Cookie有效性...');
        const cookieValid = await scraper.checkCookieValidity();
        
        if (cookieValid) {
            console.log('✅ Cookie有效，直接使用Cookie登录\n');
        } else {
            console.log('⚠️ Cookie无效，将进行扫码登录\n');
        }

        console.log('🔐 开始自动登录流程...');
        const loginResult = await scraper.autoLogin();
        
        if (loginResult) {
            console.log('✅ 登录成功！\n');
            
            console.log('🔍 测试搜索功能...');
            const result = await scraper.searchAndDownload('海底捞', '北京朝阳区');
            
            if (result) {
                console.log('✅ 搜索和下载成功！');
            } else {
                console.log('❌ 搜索和下载失败');
            }
        } else {
            console.log('❌ 登录失败');
        }
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
    } finally {
        console.log('\n🔚 关闭浏览器...');
        await scraper.close();
        console.log('✅ 测试完成');
    }
}

// 运行测试
testFixedLogin().catch(console.error);
