/**
 * AI服务模块
 * 集成GLM-4.5-Flash，提供智能图片分析和内容生成功能
 */

const GLMClient = require('./glm-client');
const fs = require('fs-extra');
const path = require('path');

class AIService {
    constructor(config = {}) {
        this.config = {
            enabled: config.enabled || false,
            apiKey: config.apiKey || process.env.GLM_API_KEY,
            apiBaseUrl: config.apiBaseUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            model: config.model || 'glm-4-flash',
            analyzeImages: config.analyzeImages || true,
            generateDescription: config.generateDescription || true,
            saveAnalysis: config.saveAnalysis || true,
            analysisPath: config.analysisPath || './ai-analysis',
            ...config
        };

        this.glmClient = new GLMClient({
            apiKey: this.config.apiKey,
            apiBaseUrl: this.config.apiBaseUrl,
            model: this.config.model
        });

        this.isEnabled = this.config.enabled && this.glmClient.isConfigured();
        
        if (this.isEnabled) {
            console.log('🤖 AI服务已启用 - GLM-4.5-Flash');
        } else {
            console.log('⚠️ AI服务未启用 - 请配置GLM API密钥');
        }
    }

    /**
     * 检查AI服务是否可用
     * @returns {boolean} 是否可用
     */
    isAvailable() {
        return this.isEnabled;
    }

    /**
     * 分析餐馆图片
     * @param {string} restaurantName 餐馆名称
     * @param {string} restaurantPath 餐馆图片目录路径
     * @param {string} location 餐馆地点
     * @returns {Promise<Object>} 分析结果
     */
    async analyzeRestaurantImages(restaurantName, restaurantPath, location = '未知地点') {
        if (!this.isAvailable()) {
            return {
                success: false,
                error: 'AI服务未启用',
                restaurantName: restaurantName
            };
        }

        try {
            console.log(`🔍 开始分析餐馆图片: ${restaurantName}`);
            
            // 获取图片文件列表
            const imageFiles = await this.getImageFiles(restaurantPath);
            
            if (imageFiles.length === 0) {
                return {
                    success: false,
                    error: '未找到图片文件',
                    restaurantName: restaurantName,
                    imageCount: 0
                };
            }

            console.log(`📸 找到 ${imageFiles.length} 张图片，开始AI分析`);

            // 分析图片
            const analysisResults = await this.glmClient.analyzeImages(
                imageFiles,
                '请详细分析这张餐馆图片，包括：1.菜品特色 2.环境氛围 3.装修风格 4.推荐亮点 5.适合场景'
            );

            // 生成餐馆描述
            let description = null;
            if (this.config.generateDescription) {
                console.log(`📝 生成餐馆描述: ${restaurantName}`);
                const descriptionResult = await this.glmClient.generateRestaurantDescription(
                    analysisResults,
                    restaurantName
                );
                description = descriptionResult.success ? descriptionResult.description : null;
            }

            // 生成餐馆评语
            let review = null;
            if (this.config.generateReview) {
                console.log(`📝 生成餐馆评语: ${restaurantName}`);
                const reviewResult = await this.glmClient.generateRestaurantReview(
                    analysisResults,
                    restaurantName,
                    location,
                    this.config.reviewPrompt
                );
                review = reviewResult.success ? reviewResult.review : null;
            }

            // 保存分析结果
            const result = {
                restaurantName: restaurantName,
                timestamp: new Date().toISOString(),
                imageCount: imageFiles.length,
                analysisResults: analysisResults,
                description: description,
                review: review,
                success: true
            };

            if (this.config.saveAnalysis) {
                await this.saveAnalysisResult(restaurantName, result);
            }

            console.log(`✅ 餐馆分析完成: ${restaurantName}`);
            return result;

        } catch (error) {
            console.error(`❌ 餐馆分析失败: ${restaurantName}`, error.message);
            return {
                success: false,
                error: error.message,
                restaurantName: restaurantName,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 获取目录中的图片文件
     * @param {string} directoryPath 目录路径
     * @returns {Promise<Array>} 图片文件路径数组
     */
    async getImageFiles(directoryPath) {
        if (!await fs.pathExists(directoryPath)) {
            return [];
        }

        const files = await fs.readdir(directoryPath);
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        
        return files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return imageExtensions.includes(ext);
            })
            .map(file => path.join(directoryPath, file));
    }

    /**
     * 保存分析结果
     * @param {string} restaurantName 餐馆名称
     * @param {Object} result 分析结果
     */
    async saveAnalysisResult(restaurantName, result) {
        try {
            // 确保分析结果目录存在
            await fs.ensureDir(this.config.analysisPath);

            // 清理文件名中的非法字符
            const safeName = restaurantName.replace(/[<>:"/\\|?*]/g, '_');
            const fileName = `${safeName}_analysis_${Date.now()}.json`;
            const filePath = path.join(this.config.analysisPath, fileName);

            await fs.writeJson(filePath, result, { spaces: 2 });
            console.log(`💾 分析结果已保存: ${filePath}`);

        } catch (error) {
            console.error('❌ 保存分析结果失败:', error.message);
        }
    }

    /**
     * 批量分析多个餐馆
     * @param {Array} restaurants 餐馆列表
     * @param {string} baseDownloadPath 基础下载路径
     * @returns {Promise<Array>} 批量分析结果
     */
    async batchAnalyzeRestaurants(restaurants, baseDownloadPath) {
        if (!this.isAvailable()) {
            return {
                success: false,
                error: 'AI服务未启用',
                results: []
            };
        }

        console.log(`🤖 开始批量AI分析 ${restaurants.length} 个餐馆`);
        
        const results = [];
        for (let i = 0; i < restaurants.length; i++) {
            const restaurant = restaurants[i];
            const restaurantPath = path.join(baseDownloadPath, restaurant.name);
            
            console.log(`📊 分析进度: ${i + 1}/${restaurants.length} - ${restaurant.name}`);
            
            try {
                const result = await this.analyzeRestaurantImages(restaurant.name, restaurantPath);
                results.push(result);
                
                // 添加延迟避免API限制
                if (i < restaurants.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } catch (error) {
                console.error(`❌ 分析餐馆失败: ${restaurant.name}`, error.message);
                results.push({
                    success: false,
                    error: error.message,
                    restaurantName: restaurant.name,
                    timestamp: new Date().toISOString()
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`✅ 批量AI分析完成: ${successCount}/${restaurants.length} 成功`);

        return {
            success: true,
            totalCount: restaurants.length,
            successCount: successCount,
            results: results,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 测试AI服务连接
     * @returns {Promise<Object>} 测试结果
     */
    async testConnection() {
        if (!this.isAvailable()) {
            return {
                success: false,
                message: 'AI服务未启用或配置不正确'
            };
        }

        try {
            const result = await this.glmClient.testConnection();
            return result;
        } catch (error) {
            return {
                success: false,
                message: 'AI服务连接测试失败',
                error: error.message
            };
        }
    }

    /**
     * 获取AI服务状态
     * @returns {Object} 服务状态
     */
    getStatus() {
        return {
            enabled: this.isEnabled,
            configured: this.glmClient.isConfigured(),
            model: this.config.model,
            features: {
                analyzeImages: this.config.analyzeImages,
                generateDescription: this.config.generateDescription,
                saveAnalysis: this.config.saveAnalysis
            }
        };
    }

    /**
     * 更新配置
     * @param {Object} newConfig 新配置
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.glmClient = new GLMClient({
            apiKey: this.config.apiKey,
            apiBaseUrl: this.config.apiBaseUrl,
            model: this.config.model
        });
        this.isEnabled = this.config.enabled && this.glmClient.isConfigured();
    }
}

module.exports = AIService;
