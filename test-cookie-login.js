/**
 * 测试Cookie自动登录功能
 * 验证一次登录后，后续可以自动使用Cookie登录
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');
const fs = require('fs-extra');

async function testCookieLogin() {
    console.log('🧪 开始测试Cookie自动登录功能...\n');
    
    try {
        // 检查Cookie文件是否存在
        const cookieFile = './cookies.json';
        if (await fs.pathExists(cookieFile)) {
            console.log('✅ Cookie文件存在');
            const cookies = await fs.readJson(cookieFile);
            console.log(`📊 Cookie文件包含 ${cookies.length} 个Cookie`);
        } else {
            console.log('❌ Cookie文件不存在，请先运行一次登录流程');
            return;
        }
        
        // 创建爬虫实例，配置为使用Cookie登录
        const scraper = new XiaohongshuScraper({
            downloadPath: './test-cookie-downloads',
            maxImages: 3, // 只下载3张图片进行测试
            headless: false, // 显示浏览器以便观察
            tryRemoveWatermark: true,
            enableImageProcessing: true,
            login: {
                method: 'manual', // 设置为手动登录，但优先使用Cookie
                autoLogin: true,
                saveCookies: true,
                cookieFile: './cookies.json'
            }
        });
        
        console.log('🔍 开始测试Cookie自动登录...');
        
        // 搜索并下载图片
        const result = await scraper.searchAndDownload('星巴克', '上海徐汇区');
        
        if (result.success) {
            console.log('✅ Cookie登录测试完成！');
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
            
            // 检查下载的图片
            const downloadDir = './test-cookie-downloads';
            if (await fs.pathExists(downloadDir)) {
                const files = await fs.readdir(downloadDir, { recursive: true });
                const imageFiles = files.filter(file => 
                    file.endsWith('.jpg') || file.endsWith('.jpeg') || 
                    file.endsWith('.png') || file.endsWith('.webp')
                );
                
                console.log(`📁 下载的图片文件:`);
                imageFiles.forEach(file => {
                    console.log(`   - ${file}`);
                });
            }
            
        } else {
            console.log('❌ Cookie登录测试失败:', result.error);
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
    testCookieLogin().then(() => {
        console.log('🏁 Cookie登录测试完成');
        process.exit(0);
    }).catch(error => {
        console.error('💥 测试失败:', error.message);
        process.exit(1);
    });
}

module.exports = { testCookieLogin };
