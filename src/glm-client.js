/**
 * GLM-4.5-Flash 客户端模块
 * 提供与GLM-4.5-Flash模型的交互功能
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

class GLMClient {
    constructor(config = {}) {
        this.apiKey = config.apiKey || process.env.GLM_API_KEY;
        this.apiBaseUrl = config.apiBaseUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
        this.model = config.model || 'glm-4-flash';
        this.timeout = config.timeout || 30000;
        this.maxRetries = config.maxRetries || 3;
        
        if (!this.apiKey) {
            console.warn('⚠️ GLM API密钥未配置，AI功能将不可用');
        }
    }

    /**
     * 检查API配置是否有效
     * @returns {boolean} 配置是否有效
     */
    isConfigured() {
        return !!this.apiKey;
    }

    /**
     * 发送聊天请求到GLM-4.5-Flash
     * @param {Array} messages 消息数组
     * @param {Object} options 可选参数
     * @returns {Promise<Object>} API响应
     */
    async chat(messages, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('GLM API密钥未配置');
        }

        const requestData = {
            model: this.model,
            messages: messages,
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 2000,
            stream: options.stream || false,
            ...options
        };

        // 智谱AI API认证格式：Bearer {api_key}
        const headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };

        let lastError;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`🤖 发送GLM请求 (尝试 ${attempt}/${this.maxRetries})`);
                
                const response = await axios.post(this.apiBaseUrl, requestData, {
                    headers,
                    timeout: this.timeout
                });

                if (response.data && response.data.choices && response.data.choices.length > 0) {
                    const result = response.data.choices[0];
                    console.log('✅ GLM请求成功');
                    return {
                        success: true,
                        content: result.message?.content || '',
                        usage: response.data.usage || {},
                        model: response.data.model || this.model
                    };
                } else {
                    throw new Error('API响应格式异常');
                }
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ GLM请求失败 (尝试 ${attempt}/${this.maxRetries}):`, error.message);
                
                if (attempt < this.maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000; // 指数退避
                    console.log(`⏳ ${delay}ms后重试...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw new Error(`GLM请求失败，已重试${this.maxRetries}次: ${lastError.message}`);
    }

    /**
     * 分析图片内容
     * @param {string} imagePath 图片路径
     * @param {string} prompt 分析提示词
     * @returns {Promise<Object>} 分析结果
     */
    async analyzeImage(imagePath, prompt = '请详细分析这张图片的内容，包括菜品、环境、特色等') {
        if (!await fs.pathExists(imagePath)) {
            throw new Error(`图片文件不存在: ${imagePath}`);
        }

        try {
            // 读取图片并转换为base64
            const imageBuffer = await fs.readFile(imagePath);
            const base64Image = imageBuffer.toString('base64');
            
            // 获取图片MIME类型
            const ext = path.extname(imagePath).toLowerCase();
            const mimeType = this.getMimeType(ext);

            const messages = [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: prompt
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:${mimeType};base64,${base64Image}`
                            }
                        }
                    ]
                }
            ];

            const result = await this.chat(messages, {
                temperature: 0.3, // 降低温度以获得更准确的分析
                maxTokens: 1000
            });

            return {
                success: true,
                analysis: result.content,
                imagePath: imagePath,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ 图片分析失败:', error.message);
            return {
                success: false,
                error: error.message,
                imagePath: imagePath,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 批量分析图片
     * @param {Array} imagePaths 图片路径数组
     * @param {string} prompt 分析提示词
     * @returns {Promise<Array>} 分析结果数组
     */
    async analyzeImages(imagePaths, prompt) {
        console.log(`🔍 开始批量分析 ${imagePaths.length} 张图片`);
        
        const results = [];
        for (let i = 0; i < imagePaths.length; i++) {
            const imagePath = imagePaths[i];
            console.log(`📸 分析图片 ${i + 1}/${imagePaths.length}: ${path.basename(imagePath)}`);
            
            try {
                const result = await this.analyzeImage(imagePath, prompt);
                results.push(result);
                
                // 添加延迟避免API限制
                if (i < imagePaths.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.error(`❌ 分析图片失败: ${imagePath}`, error.message);
                results.push({
                    success: false,
                    error: error.message,
                    imagePath: imagePath,
                    timestamp: new Date().toISOString()
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`✅ 批量分析完成: ${successCount}/${imagePaths.length} 成功`);
        
        return results;
    }

    /**
     * 生成餐馆描述
     * @param {Array} analysisResults 图片分析结果
     * @param {string} restaurantName 餐馆名称
     * @returns {Promise<Object>} 生成的描述
     */
    async generateRestaurantDescription(analysisResults, restaurantName) {
        const successfulAnalyses = analysisResults.filter(r => r.success);
        
        if (successfulAnalyses.length === 0) {
            return {
                success: false,
                error: '没有成功的图片分析结果',
                restaurantName: restaurantName
            };
        }

        const prompt = `基于以下图片分析结果，为"${restaurantName}"生成一份详细的餐馆描述：

${successfulAnalyses.map((result, index) => 
    `图片${index + 1}分析：${result.analysis}`
).join('\n\n')}

请生成一份包含以下内容的餐馆描述：
1. 餐馆特色和亮点
2. 推荐菜品
3. 环境氛围
4. 适合场景
5. 总体评价

要求：语言生动、专业，适合用于美食推荐。`;

        try {
            const result = await this.chat([{
                role: 'user',
                content: prompt
            }], {
                temperature: 0.7,
                maxTokens: 1500
            });

            return {
                success: true,
                description: result.content,
                restaurantName: restaurantName,
                basedOnImages: successfulAnalyses.length,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ 生成餐馆描述失败:', error.message);
            return {
                success: false,
                error: error.message,
                restaurantName: restaurantName,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 生成餐馆评语
     * @param {Array} analysisResults 图片分析结果
     * @param {string} restaurantName 餐馆名称
     * @param {string} location 餐馆地点
     * @param {string} reviewPrompt 评语提示词
     * @returns {Promise<Object>} 生成的评语
     */
    async generateRestaurantReview(analysisResults, restaurantName, location, reviewPrompt) {
        const successfulAnalyses = analysisResults.filter(r => r.success);
        
        if (successfulAnalyses.length === 0) {
            return {
                success: false,
                error: '没有成功的图片分析结果',
                restaurantName: restaurantName
            };
        }

        const prompt = `${reviewPrompt}

**用户输入**: ${restaurantName} (${location})

基于以下图片分析结果，生成一篇真实的五星好评笔记：

${successfulAnalyses.map((result, index) => 
    `图片${index + 1}分析：${result.analysis}`
).join('\n\n')}

请严格按照上述要求生成评语，要求：
1. 语气自然，避免夸张的网络热词
2. 描述具体，少用形容词
3. 内容有侧重，而非全部吹捧
4. 包含标题、正文和结尾标签
5. 约300字左右`;

        try {
            const result = await this.chat([{
                role: 'user',
                content: prompt
            }], {
                temperature: 0.8,
                maxTokens: 800
            });

            return {
                success: true,
                review: result.content,
                restaurantName: restaurantName,
                location: location,
                basedOnImages: successfulAnalyses.length,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ 生成餐馆评语失败:', error.message);
            return {
                success: false,
                error: error.message,
                restaurantName: restaurantName,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 获取图片MIME类型
     * @param {string} extension 文件扩展名
     * @returns {string} MIME类型
     */
    getMimeType(extension) {
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp'
        };
        return mimeTypes[extension] || 'image/jpeg';
    }

    /**
     * 测试API连接
     * @returns {Promise<Object>} 测试结果
     */
    async testConnection() {
        try {
            const result = await this.chat([{
                role: 'user',
                content: '你好，请简单介绍一下你自己。'
            }], {
                temperature: 0.3,
                maxTokens: 100
            });

            return {
                success: true,
                message: 'GLM-4.5-Flash连接测试成功',
                response: result.content
            };
        } catch (error) {
            return {
                success: false,
                message: 'GLM-4.5-Flash连接测试失败',
                error: error.message
            };
        }
    }
}

module.exports = GLMClient;
