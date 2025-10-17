/**
 * 测试下载功能调试
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');
const fs = require('fs-extra');

async function testDownloadDebug() {
    console.log('🔍 开始调试下载功能...\n');
    
    const scraper = new XiaohongshuScraper({
        downloadPath: './test-downloads',
        maxImages: 2, // 只下载2张图片进行测试
        headless: false, // 显示浏览器窗口
        delay: 2000,
        login: {
            method: 'manual',
            autoLogin: true,
            saveCookies: true,
            cookieFile: './cookies.json'
        }
    });

    try {
        console.log('🔧 初始化浏览器...');
        await scraper.initBrowser();
        console.log('✅ 浏览器初始化完成\n');

        console.log('🔐 检查登录状态...');
        const isLoggedIn = await scraper.checkLoginStatus();
        if (!isLoggedIn) {
            console.log('❌ 未登录，无法继续测试');
            return;
        }
        console.log('✅ 登录状态正常\n');

        console.log('🔍 测试搜索功能...');
        const result = await scraper.searchAndDownload('海底捞', '北京朝阳区');
        
        if (result.success) {
            console.log('✅ 搜索和下载成功！');
            console.log(`📊 下载统计: ${result.downloadedCount} 成功, ${result.failedCount} 失败`);
        } else {
            console.log('❌ 搜索和下载失败:', result.error);
        }
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
        console.error('详细错误:', error);
    } finally {
        console.log('\n🔚 关闭浏览器...');
        await scraper.close();
        console.log('✅ 测试完成');
    }
}

// 运行测试
testDownloadDebug().catch(console.error);
