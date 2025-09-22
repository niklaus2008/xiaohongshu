/**
 * 搜索便宜坊 朝阳公园店并下载图片
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

async function testPianyifang() {
    console.log('🏮 搜索便宜坊 朝阳公园店并下载图片...\n');
    
    const scraper = new XiaohongshuScraper({
        downloadPath: './pianyifang-downloads',
        maxImages: 5, // 下载5张图片
        headless: false, // 显示浏览器窗口
        delay: 2000,
        login: {
            method: 'qr',
            autoLogin: true,
            saveCookies: true,
            cookieFile: './cookies.json'
        }
    });

    try {
        console.log('🔧 初始化浏览器...');
        await scraper.initBrowser();
        console.log('✅ 浏览器初始化完成\n');

        console.log('🔍 开始搜索便宜坊 朝阳公园店...');
        const restaurantName = '便宜坊';
        const location = '朝阳公园店';
        
        const result = await scraper.searchAndDownload(restaurantName, location);
        
        if (result) {
            console.log('✅ 搜索和下载成功！\n');
            
            // 验证下载结果
            console.log('🔍 验证下载结果...');
            const fs = require('fs-extra');
            const path = require('path');
            
            const downloadDir = path.join(process.cwd(), 'pianyifang-downloads');
            const searchDir = path.join(downloadDir, `${restaurantName}_${location}`);
            
            if (await fs.pathExists(searchDir)) {
                const files = await fs.readdir(searchDir);
                const imageFiles = files.filter(file => 
                    /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
                );
                
                console.log(`✅ 下载验证成功！`);
                console.log(`📁 下载目录: ${searchDir}`);
                console.log(`📊 下载文件数量: ${imageFiles.length}`);
                console.log(`📋 文件列表:`);
                imageFiles.forEach((file, index) => {
                    const filePath = path.join(searchDir, file);
                    const stats = fs.statSync(filePath);
                    const sizeKB = Math.round(stats.size / 1024);
                    console.log(`   ${index + 1}. ${file} (${sizeKB}KB)`);
                });
            } else {
                console.log('❌ 下载目录不存在');
            }
        } else {
            console.log('❌ 搜索和下载失败');
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
testPianyifang().catch(console.error);