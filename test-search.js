/**
 * 测试搜索和下载功能
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

async function testSearch() {
    console.log('🧪 测试搜索和下载功能...\n');
    
    const scraper = new XiaohongshuScraper({
        downloadPath: './test-downloads',
        maxImages: 10, // 下载10张图片
        headless: false,
        delay: 2000,
        login: {
            method: 'qr',
            autoLogin: true,
            saveCookies: true,
            cookieFile: './test-cookies.json'
        }
    });

    try {
        console.log('🔍 开始搜索和下载...');
        const result = await scraper.searchAndDownload('海底捞', '北京朝阳区');
        
        console.log('\n📊 测试结果:');
        console.log(`成功: ${result.success}`);
        if (result.success) {
            console.log(`找到图片: ${result.totalFound} 张`);
            console.log(`下载成功: ${result.downloadedCount} 张`);
            console.log(`下载失败: ${result.failedCount} 张`);
        } else {
            console.log(`错误: ${result.error}`);
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    } finally {
        await scraper.close();
    }
}

testSearch().catch(console.error);
