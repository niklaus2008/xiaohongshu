/**
 * 评语生成功能测试脚本
 * 测试GLM-4.5-Flash生成餐馆评语的功能
 */

const GLMClient = require('./src/glm-client');
const fs = require('fs-extra');
const path = require('path');

async function testReviewGeneration() {
    console.log('📝 开始测试评语生成功能...\n');

    // 创建GLM客户端
    const glmClient = new GLMClient({
        apiKey: '3134eeac071543cda4d2a9f7a82a38af.Uz7CREy8nd3HVMC2',
        model: 'glm-4-flash'
    });

    // 模拟图片分析结果
    const mockAnalysisResults = [
        {
            success: true,
            analysis: '这是一张精美的川菜图片，可以看到红油满满的宫保鸡丁，鸡肉嫩滑，花生米酥脆，配菜丰富，色泽诱人。整体摆盘精致，体现了川菜的麻辣特色。',
            imagePath: '/test/川菜1.jpg'
        },
        {
            success: true,
            analysis: '这是一张餐厅环境图片，可以看到古色古香的装修风格，木质桌椅，暖黄色灯光，营造出温馨的用餐氛围。墙上挂着传统字画，体现了中式餐厅的文化底蕴。',
            imagePath: '/test/环境1.jpg'
        },
        {
            success: true,
            analysis: '这是一张招牌菜图片，可以看到麻辣香锅，食材丰富多样，包括土豆、藕片、豆皮、肉片等，红油汤底浓郁，配菜新鲜，看起来很有食欲。',
            imagePath: '/test/招牌菜1.jpg'
        }
    ];

    // 评语生成提示词
    const reviewPrompt = `# 角色
你是一位普通的美食爱好者，不是专业的博主。你写评价的目的是为了客观记录自己的用餐感受，并给其他食客提供真实的参考。你的语言风格朴实、真诚，会注重描述事实和细节，而不是堆砌形容词。

# 任务
根据用户提供的店家信息，创作一篇约300字的、风格真实的五星好评笔记。评价应听起来像一个细心的普通顾客写的，可以有褒奖，但要说出具体好在哪里。

# 风格与要求
1.  **语气自然，避免夸张**:
    * **核心要求**：完全避免使用"YYDS"、"绝绝子"、"好吃到哭"这类过于夸张的网络热词。
    * 请使用更生活化的正面词汇，例如："味道不错"、"印象挺深"、"确实可以"、"值得一试"、"没有踩雷"、"比预想的好"。

2.  **描述具体，少用形容词**:
    * 不要只说"好吃"，要说出"怎么个好吃法"。
    * **鼓励的描述方式**：多描述口感、食材和做法带来的感受。例如，用"鱼肉很嫩，筷子一夹就下来了，而且没什么刺"来代替"鱼肉入口即化"；用"酱汁是咸甜口的，很下饭"来代替"酱汁浓郁美味"。

3.  **内容有侧重，而非全部吹捧**:
    * 可以重点夸一两道最出彩的菜，其他菜品可以用"也还不错"、"中规中矩"等词语带过，这样更显真实。
    * 可以在夸赞菜品的同时，提及一些中性的细节，如"店里人挺多的，饭点可能要等位"、"价格不算便宜，但用料确实不错"等，让评价更立体。

4.  **结构与格式**: 依然保留大众点评的格式要求。
    * **标题**: 简单直接，可以加上Emoji，但不要过于浮夸。
    * **正文**: 先说整体感受，再分点说几道菜，最后简单总结。
    * **结尾标签**: 必须包含以下活动标签：#创作者赏金计划 #0元玩转这座城 #城市向导官# 优质创作者赏金计划，然后加上店家关键词。

5.  **避免重复语句**:
    * **严格禁止**使用以下固定语句："店里人挺多的，饭点可能要等位，价格不算便宜，但用料确实不错"。
    * 每次生成评语时，必须使用完全不同的表达方式和词汇。
    * 可以变化的中性描述：如"环境不错"、"服务态度好"、"性价比还可以"、"值得推荐"、"位置方便"、"装修有特色"、"服务周到"等。
    * 如果必须提及类似内容，请用完全不同的表达方式，如"人气很旺"、"环境舒适"、"价格合理"、"食材新鲜"等。

6.  **结合特色菜信息**:
    * 如果提供了店家的特色菜信息，要结合图片分析结果，重点描述这些特色菜。
    * 将网上查到的特色菜与图片中看到的菜品相结合，写出更真实的评价。

请根据提供的餐馆图片分析结果，生成一篇真实的五星好评笔记。`;

    try {
        console.log('🤖 开始生成评语...');
        
        const result = await glmClient.generateRestaurantReview(
            mockAnalysisResults,
            '川味轩',
            '北京朝阳区',
            reviewPrompt
        );

        if (result.success) {
            console.log('✅ 评语生成成功！');
            console.log('\n📝 生成的评语：');
            console.log('=' * 50);
            console.log(result.review);
            console.log('=' * 50);
            
            // 保存评语到文件
            const reviewPath = './test-review.md';
            await fs.writeFile(reviewPath, result.review, 'utf8');
            console.log(`\n💾 评语已保存到: ${reviewPath}`);
            
        } else {
            console.log(`❌ 评语生成失败: ${result.error}`);
        }

    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }

    console.log('\n🎉 评语生成功能测试完成！');
}

// 运行测试
if (require.main === module) {
    testReviewGeneration().catch(error => {
        console.error('❌ 测试失败:', error);
        process.exit(1);
    });
}

module.exports = { testReviewGeneration };
