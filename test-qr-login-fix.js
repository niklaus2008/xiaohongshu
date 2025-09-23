/**
 * 测试修复后的扫码登录功能
 * 专门用于解决登录页面没有弹出的问题
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

async function testQrLoginFix() {
    console.log('🧪 测试修复后的扫码登录功能...\n');
    
    const scraper = new XiaohongshuScraper({
        downloadPath: './test-qr-login-downloads',
        maxImages: 2, // 只下载2张图片进行测试
        headless: false, // 显示浏览器窗口，方便观察登录过程
        delay: 2000,
        login: {
            method: 'qr', // 使用扫码登录
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

        console.log('🔐 开始扫码登录流程...');
        console.log('📱 程序将自动打开浏览器并尝试触发登录页面...');
        console.log('⏳ 请等待浏览器打开并显示登录界面...\n');
        
        const loginResult = await scraper.autoLogin();
        
        if (loginResult) {
            console.log('✅ 登录成功！\n');
            
            console.log('🔍 测试搜索功能...');
            const result = await scraper.searchAndDownload('海底捞', '北京朝阳区');
            
            if (result && result.success) {
                console.log('✅ 搜索和下载成功！');
                console.log(`📊 下载了 ${result.downloadedCount} 张图片`);
            } else {
                console.log('❌ 搜索和下载失败');
            }
        } else {
            console.log('❌ 登录失败');
            console.log('💡 请检查：');
            console.log('   1. 浏览器是否正确打开');
            console.log('   2. 是否出现了登录页面或二维码');
            console.log('   3. 网络连接是否正常');
        }
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
        console.log('\n🔧 故障排除建议：');
        console.log('   1. 确保已安装Chrome浏览器');
        console.log('   2. 检查网络连接');
        console.log('   3. 尝试手动访问 https://www.xiaohongshu.com');
        console.log('   4. 检查防火墙设置');
    } finally {
        console.log('\n🔚 关闭浏览器...');
        await scraper.close();
        console.log('✅ 测试完成');
    }
}

// 运行测试
console.log('🎯 小红书扫码登录修复测试\n');
console.log('📋 测试目标：');
console.log('   - 验证浏览器能正确启动');
console.log('   - 验证登录页面能正确弹出');
console.log('   - 验证扫码登录功能正常');
console.log('   - 验证Cookie保存功能正常\n');

testQrLoginFix().catch(console.error);
