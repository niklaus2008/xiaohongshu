/**
 * 小红书餐馆图片下载工具使用示例
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

/**
 * 基本使用示例
 */
async function basicExample() {
    console.log('🚀 开始基本使用示例...\n');
    
    // 创建爬虫实例
    const scraper = new XiaohongshuScraper({
        downloadPath: './downloads',
        maxImages: 10,
        headless: false, // 显示浏览器窗口，方便观察
        delay: 2000 // 2秒延迟
    });

    try {
        // 搜索并下载餐馆图片
        const result = await scraper.searchAndDownload('海底捞', '北京朝阳区');
        
        if (result.success) {
            console.log('\n✅ 下载完成！');
            console.log(`📊 统计信息:`);
            console.log(`   - 餐馆名称: ${result.restaurantName}`);
            console.log(`   - 地点: ${result.location}`);
            console.log(`   - 找到图片: ${result.totalFound} 张`);
            console.log(`   - 成功下载: ${result.downloadedCount} 张`);
            console.log(`   - 下载失败: ${result.failedCount} 张`);
            
            if (result.errors.length > 0) {
                console.log(`   - 错误数量: ${result.errors.length} 个`);
            }
        } else {
            console.log('\n❌ 下载失败:', result.error);
        }
        
    } catch (error) {
        console.error('❌ 执行过程中发生错误:', error.message);
    } finally {
        // 关闭浏览器
        await scraper.close();
    }
}

/**
 * 批量下载示例
 */
async function batchExample() {
    console.log('🚀 开始批量下载示例...\n');
    
    const scraper = new XiaohongshuScraper({
        downloadPath: './downloads',
        maxImages: 5,
        headless: true, // 无头模式，批量处理时推荐
        delay: 3000 // 3秒延迟，避免请求过快
    });

    // 要搜索的餐馆列表
    const restaurants = [
        { name: '星巴克', location: '上海徐汇区' },
        { name: '麦当劳', location: '深圳南山区' },
        { name: '肯德基', location: '广州天河区' }
    ];

    const results = [];

    try {
        for (const restaurant of restaurants) {
            console.log(`\n🔍 正在处理: ${restaurant.name} (${restaurant.location})`);
            
            const result = await scraper.searchAndDownload(restaurant.name, restaurant.location);
            results.push(result);
            
            // 在每次搜索之间添加延迟
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        // 输出批量处理结果
        console.log('\n📊 批量处理结果:');
        results.forEach((result, index) => {
            const restaurant = restaurants[index];
            console.log(`\n${index + 1}. ${restaurant.name} (${restaurant.location}):`);
            if (result.success) {
                console.log(`   ✅ 成功下载 ${result.downloadedCount} 张图片`);
            } else {
                console.log(`   ❌ 下载失败: ${result.error}`);
            }
        });
        
    } catch (error) {
        console.error('❌ 批量处理过程中发生错误:', error.message);
    } finally {
        await scraper.close();
    }
}

/**
 * 高级配置示例
 */
async function advancedExample() {
    console.log('🚀 开始高级配置示例...\n');
    
    const scraper = new XiaohongshuScraper({
        downloadPath: './downloads/advanced',
        maxImages: 15,
        headless: false,
        delay: 1500,
        timeout: 45000, // 45秒超时
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    try {
        const result = await scraper.searchAndDownload('喜茶', '杭州西湖区');
        
        console.log('\n📈 详细统计信息:');
        console.log(JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error('❌ 高级配置示例执行失败:', error.message);
    } finally {
        await scraper.close();
    }
}

/**
 * 主函数 - 选择要运行的示例
 */
async function main() {
    console.log('🎯 小红书餐馆图片下载工具示例\n');
    console.log('请选择要运行的示例:');
    console.log('1. 基本使用示例');
    console.log('2. 批量下载示例');
    console.log('3. 高级配置示例');
    console.log('4. 运行所有示例\n');
    
    // 这里可以根据需要修改，默认运行基本示例
    const choice = process.argv[2] || '1';
    
    switch (choice) {
        case '1':
            await basicExample();
            break;
        case '2':
            await batchExample();
            break;
        case '3':
            await advancedExample();
            break;
        case '4':
            await basicExample();
            await batchExample();
            await advancedExample();
            break;
        default:
            console.log('❌ 无效的选择，运行基本示例...');
            await basicExample();
    }
    
    console.log('\n🎉 示例执行完成！');
    process.exit(0);
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未处理的Promise拒绝:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ 未捕获的异常:', error);
    process.exit(1);
});

// 运行主函数
if (require.main === module) {
    main().catch(error => {
        console.error('❌ 主函数执行失败:', error);
        process.exit(1);
    });
}

module.exports = {
    basicExample,
    batchExample,
    advancedExample
};
