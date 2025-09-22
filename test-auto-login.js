/**
 * 测试自动登录检测功能
 * 验证扫码登录后程序能自动检测登录状态
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

async function testAutoLogin() {
    console.log('🧪 开始测试自动登录检测功能...\n');
    
    try {
        // 创建爬虫实例
        const scraper = new XiaohongshuScraper({
            downloadPath: './test-auto-downloads',
            maxImages: 3,
            headless: false, // 显示浏览器
            login: {
                method: 'manual', // 手动登录，但会自动检测
                autoLogin: true,
                saveCookies: true,
                cookieFile: './cookies.json'
            }
        });
        
        console.log('🔍 开始测试自动登录检测...');
        console.log('💡 请在浏览器中扫码登录，程序会自动检测登录状态');
        
        // 搜索并下载图片
        const result = await scraper.searchAndDownload('肯德基', '广州天河区');
        
        if (result.success) {
            console.log('✅ 自动登录检测测试完成！');
            console.log(`📊 测试结果:`);
            console.log(`   - 找到图片: ${result.totalFound} 张`);
            console.log(`   - 成功下载: ${result.downloadedCount} 张`);
            console.log(`   - 下载失败: ${result.failedCount} 张`);
            
            if (result.errors.length > 0) {
                console.log(`⚠️ 错误信息:`);
                result.errors.forEach(error => {
                    console.log(`   - ${error.type}: ${error.message}`);
                });
            }
            
        } else {
            console.log('❌ 自动登录检测测试失败:', result.error);
        }
        
        // 关闭浏览器
        await scraper.close();
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
        console.error(error.stack);
    }
}

// 运行测试
if (require.main === module) {
    testAutoLogin().then(() => {
        console.log('🏁 自动登录检测测试完成');
        process.exit(0);
    }).catch(error => {
        console.error('💥 测试失败:', error.message);
        process.exit(1);
    });
}

module.exports = { testAutoLogin };
