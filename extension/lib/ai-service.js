/**
 * AI服务模块 - Chrome插件版
 * 集成GLM API，提供智能图片分析和内容生成功能
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

class AIService {
    constructor(config = {}) {
        this.config = {
            enabled: config.enabled || false,
            apiKey: config.apiKey || '',
            apiBaseUrl: config.apiBaseUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            model: config.model || 'glm-4-flash',
            timeout: config.timeout || 30000,
            maxRetries: config.maxRetries || 3,
            ...config
        };
        
        this.isEnabled = this.config.enabled && this.config.apiKey;
    }

    /**
     * 检查AI服务是否可用
     */
    isAvailable() {
        return this.isEnabled;
    }

    /**
     * 调用GLM API
     */
    async callAPI(messages, options = {}) {
        if (!this.isAvailable()) {
            throw new Error('AI服务未启用或API密钥未配置');
        }

        const requestBody = {
            model: this.config.model,
            messages: messages,
            temperature: options.temperature || 0.3,
            max_tokens: options.maxTokens || 1000
        };

        try {
            const response = await fetch(this.config.apiBaseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.choices && data.choices.length > 0) {
                return {
                    success: true,
                    content: data.choices[0].message.content,
                    usage: data.usage
                };
            } else {
                throw new Error('API返回数据格式错误');
            }
        } catch (error) {
            console.error('AI API调用失败:', error);
            throw error;
        }
    }

    /**
     * 分析图片（通过URL）
     * 注意：Chrome插件中需要先下载图片并转换为base64
     */
    async analyzeImage(imageUrl, prompt = '请详细分析这张餐馆图片，包括：1.菜品特色 2.环境氛围 3.装修风格 4.推荐亮点 5.适合场景') {
        try {
            // 下载图片并转换为base64
            const base64Image = await this.urlToBase64(imageUrl);
            
            // 获取图片MIME类型
            const mimeType = this.getMimeTypeFromUrl(imageUrl);

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

            const result = await this.callAPI(messages, {
                temperature: 0.3,
                maxTokens: 1000
            });

            return {
                success: true,
                analysis: result.content,
                imageUrl: imageUrl,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('图片分析失败:', error);
            return {
                success: false,
                error: error.message,
                imageUrl: imageUrl,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 批量分析图片
     */
    async analyzeImages(imageUrls, prompt) {
        const results = [];
        
        for (const url of imageUrls) {
            try {
                const result = await this.analyzeImage(url, prompt);
                results.push(result);
                // 延迟避免请求过快
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error('分析图片失败:', url, error);
                results.push({
                    success: false,
                    error: error.message,
                    imageUrl: url
                });
            }
        }
        
        return results;
    }

    /**
     * 生成餐馆描述
     */
    async generateRestaurantDescription(analysisResults, restaurantName, location = '', specialties = []) {
        const analysisText = analysisResults
            .filter(r => r.success)
            .map((r, i) => `图片${i + 1}分析：${r.analysis}`)
            .join('\n\n');

        const specialtiesText = specialties.length > 0 
            ? `\n\n特色菜信息：${specialties.join('、')}`
            : '';

        const prompt = `请基于以下图片分析结果，为餐馆"${restaurantName}"${location ? `（位于${location}）` : ''}生成一段详细的描述，包括：
1. 餐馆的整体特色和亮点
2. 菜品推荐和特色
3. 环境氛围和装修风格
4. 适合的用餐场景
5. 推荐理由

图片分析结果：
${analysisText}${specialtiesText}

要求：描述要真实自然，避免夸张的网络热词，突出具体特色。`;

        try {
            const result = await this.callAPI([{
                role: 'user',
                content: prompt
            }], {
                temperature: 0.7,
                maxTokens: 500
            });

            return {
                success: true,
                description: result.content
            };
        } catch (error) {
            console.error('生成描述失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 生成评语
     */
    async generateReview(analysisResults, restaurantName, location = '', specialties = []) {
        const analysisText = analysisResults
            .filter(r => r.success)
            .map((r, i) => `图片${i + 1}分析：${r.analysis}`)
            .join('\n\n');

        const specialtiesText = specialties.length > 0 
            ? `\n\n特色菜信息：${specialties.join('、')}`
            : '';

        const prompt = `请基于以下图片分析结果，为餐馆"${restaurantName}"${location ? `（位于${location}）` : ''}生成一段符合大众点评风格的五星好评笔记。

要求：
1. 直接输出评语内容，不要包含"标题:"、"正文:"、"结尾标签:"等格式标识词
2. 语气自然真实，避免夸张的网络热词
3. 描述具体，内容有侧重
4. 结尾包含大众点评活动标签：#创作者赏金计划 #0元玩转这座城 #城市向导官# 优质创作者赏金计划
5. 避免重复使用固定语句，增加词汇多样性

图片分析结果：
${analysisText}${specialtiesText}

请生成评语：`;

        try {
            const result = await this.callAPI([{
                role: 'user',
                content: prompt
            }], {
                temperature: 0.8,
                maxTokens: 800
            });

            return {
                success: true,
                review: result.content
            };
        } catch (error) {
            console.error('生成评语失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 将图片URL转换为base64
     */
    async urlToBase64(url) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            throw new Error(`图片转换失败: ${error.message}`);
        }
    }

    /**
     * 从URL获取MIME类型
     */
    getMimeTypeFromUrl(url) {
        const ext = url.match(/\.(jpg|jpeg|png|gif|webp)$/i)?.[1]?.toLowerCase();
        const mimeTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp'
        };
        return mimeTypes[ext] || 'image/jpeg';
    }

    /**
     * 测试API连接
     */
    async testConnection() {
        try {
            const result = await this.callAPI([{
                role: 'user',
                content: '你好，请简单介绍一下你自己。'
            }], {
                temperature: 0.3,
                maxTokens: 100
            });

            return {
                success: true,
                message: 'GLM API连接测试成功',
                response: result.content
            };
        } catch (error) {
            return {
                success: false,
                message: 'GLM API连接测试失败',
                error: error.message
            };
        }
    }
}

// 如果在浏览器环境中，导出到全局
if (typeof window !== 'undefined') {
    window.AIService = AIService;
}

// 如果在Node.js环境中，使用module.exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIService;
}

