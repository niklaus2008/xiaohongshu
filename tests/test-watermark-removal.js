/**
 * 测试水印去除功能
 * 用于验证新的水印处理功能是否正常工作
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');
const fs = require('fs-extra');
const path = require('path');

async function testWatermarkRemoval() {
    console.log('🧪 开始测试水印去除功能...');
    
    try {
        // 创建测试用的爬虫实例
        const scraper = new XiaohongshuScraper({
            downloadPath: './test-watermark-downloads',
            maxImages: 3, // 只下载3张图片进行测试
            headless: false, // 显示浏览器以便观察
            tryRemoveWatermark: true, // 启用水印去除
            enableImageProcessing: true, // 启用图片后处理
            login: {
                method: 'manual',
                autoLogin: true,
                saveCookies: true,
                cookieFile: './test-cookies.json'
            }
        });
        
        console.log('🔍 开始搜索测试餐馆...');
        
        // 搜索并下载图片
        const result = await scraper.searchAndDownload('便宜坊', '朝阳公园店');
        
        if (result.success) {
            console.log('✅ 测试完成！');
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
            const downloadDir = './test-watermark-downloads';
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
                
                console.log(`\n💡 请检查下载的图片，查看水印去除效果：`);
                console.log(`   - 图片是否已去除右下角的"小红书"水印`);
                console.log(`   - 图片质量是否保持良好`);
                console.log(`   - 是否有其他处理痕迹`);
            }
            
        } else {
            console.log('❌ 测试失败:', result.error);
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
    testWatermarkRemoval().then(() => {
        console.log('🏁 测试完成');
        process.exit(0);
    }).catch(error => {
        console.error('💥 测试失败:', error.message);
        process.exit(1);
    });
}

module.exports = { testWatermarkRemoval };