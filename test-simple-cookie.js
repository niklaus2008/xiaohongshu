/**
 * 简单的Cookie登录测试
 * 验证Cookie加载和登录状态检测
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');
const fs = require('fs-extra');

async function testSimpleCookieLogin() {
    console.log('🧪 开始简单Cookie登录测试...\n');
    
    try {
        // 检查Cookie文件
        const cookieFile = './cookies.json';
        if (await fs.pathExists(cookieFile)) {
            const cookies = await fs.readJson(cookieFile);
            console.log(`✅ Cookie文件存在，包含 ${cookies.length} 个Cookie`);
        } else {
            console.log('❌ Cookie文件不存在');
            return;
        }
        
        // 创建爬虫实例
        const scraper = new XiaohongshuScraper({
            downloadPath: './test-simple-downloads',
            maxImages: 2,
            headless: false,
            login: {
                method: 'manual',
                autoLogin: true,
                saveCookies: true,
                cookieFile: './cookies.json'
            }
        });
        
        console.log('🔍 开始测试Cookie登录...');
        
        // 只测试搜索，不下载图片
        const result = await scraper.searchAndDownload('麦当劳', '深圳');
        
        console.log('📊 测试结果:', {
            success: result.success,
            totalFound: result.totalFound,
            downloadedCount: result.downloadedCount,
            errors: result.errors.length
        });
        
        await scraper.close();
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

// 运行测试
if (require.main === module) {
    testSimpleCookieLogin().then(() => {
        console.log('🏁 简单Cookie测试完成');
        process.exit(0);
    }).catch(error => {
        console.error('💥 测试失败:', error.message);
        process.exit(1);
    });
}

module.exports = { testSimpleCookieLogin };
