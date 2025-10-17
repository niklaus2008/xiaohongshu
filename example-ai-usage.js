/**
 * AI功能使用示例
 * 展示如何使用GLM-4.5-Flash进行图片分析
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');
const AIService = require('./src/ai-service');

async function exampleAIUsage() {
    console.log('🤖 AI功能使用示例\n');

    // 1. 配置AI服务
    const aiConfig = {
        enabled: true,
        apiKey: process.env.GLM_API_KEY || 'your-api-key-here',
        model: 'glm-4-flash',
        analyzeImages: true,
        generateDescription: true,
        saveAnalysis: true,
        analysisPath: './ai-analysis'
    };

    console.log('📋 步骤1: 配置AI服务');
    console.log('AI配置:', JSON.stringify(aiConfig, null, 2));

    // 2. 创建爬虫实例（集成AI功能）
    const scraper = new XiaohongshuScraper({
        downloadPath: './downloads',
        maxImages: 5,
        headless: false,
        login: {
            method: 'manual',
            autoLogin: true,
            saveCookies: true
        },
        ai: aiConfig // 传递AI配置
    });

    console.log('\n📋 步骤2: 创建爬虫实例（已集成AI功能）');
    console.log('✅ 爬虫实例创建成功，AI功能已集成');

    // 3. 模拟搜索和下载（带AI分析）
    console.log('\n📋 步骤3: 模拟搜索和下载（带AI分析）');
    
    try {
        // 注意：这里只是示例，实际使用时需要有效的API密钥
        const result = await scraper.searchAndDownload('海底捞', '北京朝阳区');
        
        console.log('✅ 搜索和下载完成');
        console.log('📊 结果统计:');
        console.log(`   - 餐馆名称: ${result.restaurantName}`);
        console.log(`   - 找到图片: ${result.totalFound} 张`);
        console.log(`   - 下载成功: ${result.downloadedCount} 张`);
        console.log(`   - 下载失败: ${result.failedCount} 张`);
        
        if (result.aiAnalysis) {
            console.log('\n🤖 AI分析结果:');
            if (result.aiAnalysis.success) {
                console.log(`   - 分析图片: ${result.aiAnalysis.imageCount} 张`);
                console.log(`   - 生成描述: ${result.aiAnalysis.description ? '是' : '否'}`);
                console.log(`   - 保存结果: ${result.aiAnalysis.success ? '是' : '否'}`);
            } else {
                console.log(`   - AI分析失败: ${result.aiAnalysis.error}`);
            }
        } else {
            console.log('\n⚠️ 未进行AI分析（可能未启用或配置不正确）');
        }

    } catch (error) {
        console.log(`❌ 搜索和下载失败: ${error.message}`);
        console.log('💡 提示: 请确保已正确配置GLM API密钥');
    }

    // 4. 关闭爬虫
    await scraper.close();
    console.log('\n✅ 爬虫实例已关闭');

    console.log('\n📝 使用说明:');
    console.log('1. 获取GLM API密钥: https://open.bigmodel.cn/');
    console.log('2. 设置环境变量: export GLM_API_KEY=your-api-key');
    console.log('3. 运行示例: node example-ai-usage.js');
    console.log('4. 或使用Web界面: npm run start:web');
}

// 运行示例
if (require.main === module) {
    exampleAIUsage().catch(error => {
        console.error('❌ 示例运行失败:', error);
        process.exit(1);
    });
}

module.exports = { exampleAIUsage };
