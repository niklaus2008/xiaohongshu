/**
 * 水印去除功能使用示例
 * 展示如何使用新的水印去除功能
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

async function exampleWatermarkRemoval() {
    console.log('🚫 小红书水印去除功能示例');
    console.log('=====================================');
    
    try {
        // 创建爬虫实例，启用水印去除功能
        const scraper = new XiaohongshuScraper({
            downloadPath: './downloads',
            maxImages: 10, // 最多下载10张图片
            headless: false, // 显示浏览器
            tryRemoveWatermark: true, // 启用水印去除
            enableImageProcessing: true, // 启用图片后处理
            login: {
                method: 'manual', // 手动登录
                autoLogin: true, // 自动登录
                saveCookies: true, // 保存Cookie
                cookieFile: './cookies.json'
            }
        });
        
        console.log('🔍 开始搜索餐馆图片...');
        console.log('💡 提示：程序将自动尝试去除图片中的"小红书"水印');
        
        // 搜索并下载图片
        const result = await scraper.searchAndDownload('海底捞', '北京朝阳区');
        
        if (result.success) {
            console.log('\n✅ 下载完成！');
            console.log('📊 下载统计:');
            console.log(`   - 找到图片: ${result.totalFound} 张`);
            console.log(`   - 成功下载: ${result.downloadedCount} 张`);
            console.log(`   - 下载失败: ${result.failedCount} 张`);
            
            console.log('\n🚫 水印处理说明:');
            console.log('   - 已尝试通过URL参数优化获取无水印原图');
            console.log('   - 已使用图片后处理技术去除水印');
            console.log('   - 已自动裁剪右下角水印区域');
            console.log('   - 已调整图片参数减少水印可见性');
            
            console.log('\n📁 请检查下载的图片，查看水印去除效果');
            
        } else {
            console.log('❌ 下载失败:', result.error);
        }
        
        // 关闭浏览器
        await scraper.close();
        
    } catch (error) {
        console.error('❌ 运行过程中发生错误:', error.message);
    }
}

// 运行示例
if (require.main === module) {
    exampleWatermarkRemoval().then(() => {
        console.log('\n🏁 示例运行完成');
        process.exit(0);
    }).catch(error => {
        console.error('💥 示例运行失败:', error.message);
        process.exit(1);
    });
}

module.exports = { exampleWatermarkRemoval };
