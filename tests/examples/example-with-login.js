/**
 * 小红书餐馆图片下载工具 - 带自动登录功能的使用示例
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');
const fs = require('fs-extra');

/**
 * 从配置文件加载设置
 */
function loadConfig() {
    try {
        const configPath = './config.json';
        if (fs.existsSync(configPath)) {
            const config = fs.readJsonSync(configPath);
            console.log('✅ 配置文件加载成功');
            return config;
        } else {
            console.log('⚠️ 配置文件不存在，使用默认配置');
            return null;
        }
    } catch (error) {
        console.error('❌ 加载配置文件失败:', error.message);
        return null;
    }
}

/**
 * 带自动登录的示例
 */
async function exampleWithAutoLogin() {
    console.log('🚀 开始带自动登录功能的示例...\n');
    
    // 加载配置文件
    const config = loadConfig();
    
    if (!config) {
        console.log('❌ 无法加载配置文件，请确保 config.json 文件存在');
        return;
    }
    
    // 创建爬虫实例，使用配置文件中的设置
    const scraper = new XiaohongshuScraper({
        ...config.scraper,
        login: config.login
    });

    try {
        console.log('📋 当前配置:');
        console.log(`   - 下载路径: ${config.scraper.downloadPath}`);
        console.log(`   - 最大图片数: ${config.scraper.maxImages}`);
        console.log(`   - 无头模式: ${config.scraper.headless}`);
        console.log(`   - 自动登录: ${config.login.autoLogin}`);
        console.log(`   - 用户名: ${config.login.username}\n`);
        
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
                console.log('   错误详情:');
                result.errors.forEach((error, index) => {
                    console.log(`     ${index + 1}. ${error.type}: ${error.message}`);
                });
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
 * 批量下载示例（带自动登录）
 */
async function batchExampleWithLogin() {
    console.log('🚀 开始批量下载示例（带自动登录）...\n');
    
    const config = loadConfig();
    if (!config) {
        console.log('❌ 无法加载配置文件');
        return;
    }
    
    const scraper = new XiaohongshuScraper({
        ...config.scraper,
        login: config.login,
        headless: true // 批量处理时使用无头模式
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
 * 主函数
 */
async function main() {
    console.log('🎯 小红书餐馆图片下载工具 - 自动登录版本\n');
    
    const choice = process.argv[2] || '1';
    
    switch (choice) {
        case '1':
            await exampleWithAutoLogin();
            break;
        case '2':
            await batchExampleWithLogin();
            break;
        default:
            console.log('❌ 无效的选择，运行基本示例...');
            await exampleWithAutoLogin();
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
    exampleWithAutoLogin,
    batchExampleWithLogin
};
