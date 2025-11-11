/**
 * AI服务 - 在Chrome插件中调用GLM API
 * 支持图片分析和评语生成
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

class AIService {
    /**
     * 构造函数
     * @param {Object} config - AI配置
     * @param {string} config.apiKey - GLM API密钥
     * @param {string} config.model - 模型名称（默认：glm-4v-plus）
     * @param {string} config.baseUrl - API基础URL
     */
    constructor(config = {}) {
        this.apiKey = config.apiKey || '';
        this.model = config.model || 'glm-4v-plus';
        this.baseUrl = config.baseUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
        this.enabled = config.enabled !== false && !!this.apiKey;
    }

    /**
     * 检查AI服务是否可用
     * @returns {boolean}
     */
    isAvailable() {
        return this.enabled && !!this.apiKey;
    }

    /**
     * 将图片URL转换为base64
     * @param {string} imageUrl - 图片URL
     * @returns {Promise<string>} base64字符串
     */
    async imageToBase64(imageUrl) {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result.split(',')[1]; // 移除data:image/...;base64,前缀
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('图片转base64失败:', error);
            throw error;
        }
    }

    /**
     * 分析图片
     * @param {string|Array<string>} imageUrls - 图片URL或URL数组
     * @param {string} prompt - 分析提示词
     * @returns {Promise<Object>} 分析结果
     */
    async analyzeImages(imageUrls, prompt = '请详细分析这张餐馆图片，包括：1.菜品特色 2.环境氛围 3.装修风格 4.推荐亮点 5.适合场景') {
        if (!this.isAvailable()) {
            throw new Error('AI服务未启用或API密钥未配置');
        }

        const urls = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
        const imageContents = [];

        // 转换所有图片为base64
        for (const url of urls) {
            try {
                const base64 = await this.imageToBase64(url);
                imageContents.push({
                    type: 'image_url',
                    image_url: {
                        url: `data:image/jpeg;base64,${base64}`
                    }
                });
            } catch (error) {
                console.error('处理图片失败:', url, error);
            }
        }

        if (imageContents.length === 0) {
            throw new Error('没有可用的图片');
        }

        // 构建请求
        const messages = [{
            role: 'user',
            content: [
                { type: 'text', text: prompt },
                ...imageContents
            ]
        }];

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
            }

            const data = await response.json();
            return {
                success: true,
                content: data.choices[0]?.message?.content || '',
                usage: data.usage || {}
            };
        } catch (error) {
            console.error('AI分析失败:', error);
            throw error;
        }
    }

    /**
     * 生成评语
     * @param {Array<Object>} analysisResults - 图片分析结果数组
     * @param {string} restaurantName - 餐馆名称
     * @param {string} location - 地点
     * @returns {Promise<Object>} 评语结果
     */
    async generateReview(analysisResults, restaurantName, location = '') {
        if (!this.isAvailable()) {
            throw new Error('AI服务未启用或API密钥未配置');
        }

        // 处理分析结果，确保格式正确
        const analysisText = analysisResults.map((result, index) => {
            if (typeof result === 'string') {
                return `图片${index + 1}分析：\n${result}`;
            } else if (result && result.content) {
                return `图片${index + 1}分析：\n${result.content}`;
            } else if (result && result.success && result.content) {
                return `图片${index + 1}分析：\n${result.content}`;
            } else {
                return `图片${index + 1}分析：\n${JSON.stringify(result)}`;
            }
        }).join('\n\n');

        const prompt = `请基于以下图片分析结果，为餐馆"${restaurantName}"${location ? `（${location}）` : ''}生成一篇真实、自然的大众点评风格五星好评笔记。

要求：
1. 语气自然真实，避免夸张网络热词
2. 描述具体，内容有侧重
3. 包含标题、正文和结尾标签
4. 直接输出评语内容，不要包含"标题:"、"正文:"、"结尾标签:"等格式标识词
5. 结尾标签必须包含：#创作者赏金计划 #0元玩转这座城 #城市向导官# 优质创作者赏金计划

图片分析结果：
${analysisText}`;

        try {
            console.log('📝 正在生成评语，餐馆:', restaurantName);
            
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'glm-4-flash', // 评语生成使用文本模型
                    messages: [{
                        role: 'user',
                        content: prompt
                    }]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { message: errorText };
                }
                throw new Error(errorData.error?.message || errorData.message || `API请求失败: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const review = data.choices[0]?.message?.content || '';

            if (!review) {
                throw new Error('AI返回的评语为空');
            }

            console.log('✅ 评语生成成功，长度:', review.length);

            return {
                success: true,
                review: review,
                usage: data.usage || {}
            };
        } catch (error) {
            console.error('生成评语失败:', error);
            throw error;
        }
    }
}

// 导出 - 支持多种环境
// 优先设置全局变量，确保在所有环境中都能访问
if (typeof globalThis !== 'undefined') {
    globalThis.AIService = AIService;
}

if (typeof self !== 'undefined') {
    // Service Worker环境
    self.AIService = AIService;
}

if (typeof window !== 'undefined') {
    // 浏览器环境
    window.AIService = AIService;
}

if (typeof module !== 'undefined' && module.exports) {
    // Node.js环境
    module.exports = AIService;
}

// 注意：AIService类已经在上面定义，通过globalThis、self、window等导出
// 在Service Worker中，通过Function构造器执行时，AIService会自动成为局部变量
// 执行后会通过return语句返回
