/**
 * 测试登录功能
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

async function testLogin() {
    console.log('🧪 测试登录功能...\n');
    
    const scraper = new XiaohongshuScraper({
        downloadPath: './test-downloads',
        maxImages: 2,
        headless: false,
        delay: 1000,
        login: {
            method: 'phone',
            phone: '15210247481',
            autoLogin: true,
            saveCookies: true,
            cookieFile: './test-cookies.json'
        }
    });

    try {
        console.log('🔍 测试搜索功能...');
        const result = await scraper.searchAndDownload('测试餐馆', '测试地点');
        
        console.log('\n📊 测试结果:');
        console.log(`成功: ${result.success}`);
        if (result.success) {
            console.log(`下载图片数: ${result.downloadedCount}`);
        } else {
            console.log(`错误: ${result.error}`);
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    } finally {
        await scraper.close();
    }
}

testLogin().catch(console.error);
