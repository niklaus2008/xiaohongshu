/**
 * AI功能集成测试脚本
 * 测试GLM-4.5-Flash的集成和AI分析功能
 */

const AIService = require('./src/ai-service');
const GLMClient = require('./src/glm-client');
const fs = require('fs-extra');
const path = require('path');

async function testAIIntegration() {
    console.log('🤖 开始测试AI功能集成...\n');

    // 测试1: GLM客户端基础功能
    console.log('📋 测试1: GLM客户端基础功能');
    try {
        const glmClient = new GLMClient({
            apiKey: process.env.GLM_API_KEY || 'test-key',
            model: 'glm-4-flash'
        });

        console.log(`✅ GLM客户端创建成功`);
        console.log(`📊 配置状态: ${glmClient.isConfigured() ? '已配置' : '未配置'}`);
        console.log(`🔧 模型: ${glmClient.model}`);
        
    } catch (error) {
        console.log(`❌ GLM客户端创建失败: ${error.message}`);
    }

    // 测试2: AI服务基础功能
    console.log('\n📋 测试2: AI服务基础功能');
    try {
        const aiService = new AIService({
            enabled: true,
            apiKey: process.env.GLM_API_KEY || 'test-key',
            model: 'glm-4-flash',
            analyzeImages: true,
            generateDescription: true,
            saveAnalysis: true
        });

        console.log(`✅ AI服务创建成功`);
        console.log(`📊 服务状态: ${aiService.isAvailable() ? '可用' : '不可用'}`);
        console.log(`🔧 功能配置:`, aiService.getStatus());
        
    } catch (error) {
        console.log(`❌ AI服务创建失败: ${error.message}`);
    }

    // 测试3: 配置模板验证
    console.log('\n📋 测试3: 配置模板验证');
    try {
        const configPath = path.join(__dirname, 'config.template.json');
        if (await fs.pathExists(configPath)) {
            const config = await fs.readJson(configPath);
            if (config.ai) {
                console.log(`✅ 配置模板包含AI配置`);
                console.log(`🔧 AI配置项:`, Object.keys(config.ai));
            } else {
                console.log(`❌ 配置模板缺少AI配置`);
            }
        } else {
            console.log(`❌ 配置模板文件不存在`);
        }
    } catch (error) {
        console.log(`❌ 配置模板验证失败: ${error.message}`);
    }

    // 测试4: 图片分析功能（模拟）
    console.log('\n📋 测试4: 图片分析功能（模拟）');
    try {
        const aiService = new AIService({
            enabled: false, // 模拟未启用状态
            apiKey: 'test-key'
        });

        // 模拟分析结果
        const mockResult = {
            success: true,
            restaurantName: '测试餐馆',
            imageCount: 3,
            analysisResults: [
                {
                    success: true,
                    analysis: '这是一张精美的菜品图片，展现了餐厅的特色美食',
                    imagePath: '/test/image1.jpg'
                }
            ],
            description: '这是一家具有特色的餐厅，提供精美的菜品和优质的服务',
            timestamp: new Date().toISOString()
        };

        console.log(`✅ 模拟分析结果生成成功`);
        console.log(`📊 分析结果:`, JSON.stringify(mockResult, null, 2));
        
    } catch (error) {
        console.log(`❌ 图片分析功能测试失败: ${error.message}`);
    }

    // 测试5: 错误处理
    console.log('\n📋 测试5: 错误处理');
    try {
        const aiService = new AIService({
            enabled: true,
            apiKey: '', // 空API密钥
            model: 'glm-4-flash'
        });

        const result = await aiService.testConnection();
        console.log(`📊 连接测试结果:`, result);
        
    } catch (error) {
        console.log(`✅ 错误处理正常: ${error.message}`);
    }

    console.log('\n🎉 AI功能集成测试完成！');
    console.log('\n📝 使用说明:');
    console.log('1. 设置环境变量 GLM_API_KEY 为您的GLM API密钥');
    console.log('2. 启动Web界面: npm run start:web');
    console.log('3. 在Web界面中配置AI功能');
    console.log('4. 开始下载任务，AI会自动分析图片');
}

// 运行测试
if (require.main === module) {
    testAIIntegration().catch(error => {
        console.error('❌ 测试失败:', error);
        process.exit(1);
    });
}

module.exports = { testAIIntegration };
