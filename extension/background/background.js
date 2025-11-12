/**
 * Background Script - Service Worker
 * 处理下载管理、任务队列、消息传递等
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

// ============================================================================
// AI服务代码（内联，避免importScripts加载问题）
// ============================================================================

/**
 * AI服务 - 在Chrome插件中调用GLM API
 * 支持图片分析和评语生成
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

console.log('✅ AI服务代码已内联加载');

// ============================================================================
// 请求队列管理器
// ============================================================================

/**
 * AI请求队列管理器
 * 确保所有AI API请求串行执行，避免并发限制
 */
class AIRequestQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.defaultDelay = 3000; // 默认延迟3秒（增加延迟避免并发限制）
        this.defaultRetries = 5; // 默认重试5次（增加重试次数）
    }

    /**
     * 设置配置
     * @param {Object} config - 配置对象
     * @param {number} config.delay - 请求之间的延迟（毫秒）
     * @param {number} config.retries - 重试次数
     */
    setConfig(config = {}) {
        if (config.aiRequestDelay !== undefined) {
            // 最小延迟2秒，确保不会太快
            this.defaultDelay = Math.max(2000, parseInt(config.aiRequestDelay) || 3000);
        }
        if (config.aiRequestRetries !== undefined) {
            this.defaultRetries = Math.max(1, Math.min(10, parseInt(config.aiRequestRetries) || 5));
        }
        console.log('📋 请求队列配置已更新:', {
            delay: this.defaultDelay,
            retries: this.defaultRetries
        });
    }

    /**
     * 添加请求到队列
     * @param {Function} requestFn - 返回Promise的请求函数
     * @param {string} description - 请求描述（用于日志）
     * @returns {Promise} 请求结果
     */
    async enqueue(requestFn, description = 'AI请求') {
        return new Promise((resolve, reject) => {
            this.queue.push({
                requestFn,
                description,
                resolve,
                reject,
                retries: 0
            });
            
            this.processQueue();
        });
    }

    /**
     * 处理队列
     */
    async processQueue() {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;

        while (this.queue.length > 0) {
            const item = this.queue.shift();
            
            try {
                // 执行请求（带重试）
                const result = await this.executeWithRetry(
                    item.requestFn,
                    item.description,
                    item.retries
                );
                item.resolve(result);
            } catch (error) {
                item.reject(error);
            }

            // 请求之间的延迟（即使队列为空也延迟，确保不会连续请求过快）
            // 这样可以避免即使只有一个请求也触发并发限制
            if (this.queue.length > 0) {
                await this.delay(this.defaultDelay);
            } else {
                // 即使队列为空，也延迟一小段时间，避免快速连续请求
                await this.delay(Math.max(1000, this.defaultDelay / 2));
            }
        }

        this.processing = false;
    }

    /**
     * 执行请求（带重试机制）
     * @param {Function} requestFn - 请求函数
     * @param {string} description - 请求描述
     * @param {number} currentRetries - 当前重试次数
     * @returns {Promise} 请求结果
     */
    async executeWithRetry(requestFn, description, currentRetries = 0) {
        try {
            return await requestFn();
        } catch (error) {
            // 更全面的并发错误识别
            const errorMessage = error.message || '';
            const isConcurrencyError = (
                errorMessage.includes('并发') ||
                errorMessage.includes('concurrency') ||
                errorMessage.includes('限流') ||
                errorMessage.includes('rate limit') ||
                errorMessage.includes('限额') ||
                errorMessage.includes('过高') ||
                errorMessage.includes('降低并发') ||
                errorMessage.includes('增加限额') ||
                errorMessage.includes('too many requests') ||
                errorMessage.includes('429') // HTTP 429 Too Many Requests
            );

            // 如果是并发错误且还有重试次数，则重试
            if (isConcurrencyError && currentRetries < this.defaultRetries) {
                // 指数退避：第一次5秒，第二次10秒，第三次20秒，最多30秒
                const baseDelay = 5000;
                const retryDelay = Math.min(baseDelay * Math.pow(2, currentRetries), 30000);
                
                console.log(`⚠️ ${description} 遇到并发限制，${retryDelay}ms后重试 (${currentRetries + 1}/${this.defaultRetries})`);
                sendLog(`遇到并发限制，${retryDelay/1000}秒后重试 (${currentRetries + 1}/${this.defaultRetries})`, 'warning');
                
                await this.delay(retryDelay);
                return this.executeWithRetry(requestFn, description, currentRetries + 1);
            }

            // 其他错误或重试次数用完，直接抛出
            throw error;
        }
    }

    /**
     * 延迟函数
     * @param {number} ms - 延迟毫秒数
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 清空队列
     */
    clear() {
        this.queue = [];
        this.processing = false;
    }
}

// 创建全局请求队列实例
const aiRequestQueue = new AIRequestQueue();

// ============================================================================
// 主程序代码
// ============================================================================

// AI服务实例（在需要时从storage加载配置并初始化）
let aiServiceInstance = null;

/**
 * 检查AI服务代码是否已加载
 */
function checkAIServiceLoaded() {
    // AIService类已经内联在代码中，直接检查
    return typeof AIService !== 'undefined' && typeof AIService === 'function';
}

async function initAIService() {
    try {
        // 检查AI服务代码是否已加载（已内联在代码中）
        if (!checkAIServiceLoaded()) {
            console.warn('⚠️ AIService未定义，AI功能将不可用');
            aiServiceInstance = null;
            return;
        }
        
        // 从local读取AI配置（持久化存储）
        let result = await chrome.storage.local.get(['aiConfig']);
        let aiConfig = result.aiConfig;
        
        // 如果local中没有，尝试从sync读取（兼容旧版本）
        if (!aiConfig) {
            const syncResult = await chrome.storage.sync.get(['aiConfig']);
            if (syncResult.aiConfig) {
                // 从sync迁移到local
                aiConfig = syncResult.aiConfig;
                await chrome.storage.local.set({ aiConfig });
                await chrome.storage.sync.remove(['aiConfig']);
                console.log('✅ AI配置已从sync迁移到local');
            }
        }
        
        console.log('🔍 检查AI配置:', {
            hasConfig: !!aiConfig,
            enabled: aiConfig?.enabled,
            hasApiKey: !!aiConfig?.apiKey,
            apiKeyLength: aiConfig?.apiKey?.length || 0,
            storage: aiConfig ? 'local' : 'none'
        });
        
        if (aiConfig && aiConfig.enabled && aiConfig.apiKey) {
            try {
                
                // 构建AI服务配置（适配AIService构造函数）
                const serviceConfig = {
                    apiKey: aiConfig.apiKey,
                    model: aiConfig.model || aiConfig.apiUrl ? 'glm-4v-plus' : 'glm-4-flash',
                    baseUrl: aiConfig.apiUrl || aiConfig.baseUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
                    enabled: aiConfig.enabled
                };
                
                // 创建AI服务实例
                aiServiceInstance = new AIService(serviceConfig);
                
                // 验证服务是否可用
                if (aiServiceInstance.isAvailable()) {
                    console.log('✅ AI服务已初始化并可用');
                } else {
                    console.warn('⚠️ AI服务已创建但不可用');
                    aiServiceInstance = null;
                }
            } catch (error) {
                console.warn('⚠️ 创建AI服务实例失败:', error.message);
                console.error('错误详情:', error);
                aiServiceInstance = null;
            }
        } else {
            console.log('ℹ️ AI服务未配置，AI功能将不可用');
            if (aiConfig) {
                console.log('配置详情:', {
                    enabled: aiConfig.enabled,
                    hasApiKey: !!aiConfig.apiKey
                });
            }
            aiServiceInstance = null;
        }
    } catch (error) {
        console.error('初始化AI服务失败:', error);
        console.error('错误堆栈:', error.stack);
        aiServiceInstance = null;
    }
}

// 全局状态
let downloadQueue = [];
let isProcessing = false;
let currentTask = null;
let downloadStats = {
    total: 0,
    completed: 0,
    success: 0,
    failed: 0
};
let allRestaurants = []; // 保存所有餐馆的原始数据，用于状态同步
let completedRestaurantsList = []; // 保存所有已完成的餐馆状态

// 初始化AI服务
async function initAIService() {
    try {
        // 如果 AIService 未加载，跳过初始化
        if (!AIService || typeof AIService === 'undefined') {
            console.log('AI服务未加载，跳过初始化');
            return;
        }
        
        // 从local读取AI配置（持久化存储）
        let result = await chrome.storage.local.get(['aiConfig']);
        let aiConfig = result.aiConfig;
        
        // 如果local中没有，尝试从sync读取（兼容旧版本）
        if (!aiConfig) {
            const syncResult = await chrome.storage.sync.get(['aiConfig']);
            if (syncResult.aiConfig) {
                // 从sync迁移到local
                aiConfig = syncResult.aiConfig;
                await chrome.storage.local.set({ aiConfig });
                await chrome.storage.sync.remove(['aiConfig']);
                console.log('✅ AI配置已从sync迁移到local');
            }
        }
        
        if (aiConfig && aiConfig.enabled && aiConfig.apiKey) {
            try {
                aiServiceInstance = new AIService(aiConfig);
                console.log('✅ AI服务已初始化');
            } catch (error) {
                console.error('创建AI服务实例失败:', error);
            }
        }
    } catch (error) {
        console.error('初始化AI服务失败:', error);
    }
}

// Service Worker 启动日志
console.log('🚀 Background Service Worker 已启动');
console.log('📍 当前时间:', new Date().toLocaleString());

// 初始化
initAIService().then(() => {
    console.log('✅ 初始化完成');
}).catch(error => {
    console.error('❌ 初始化失败:', error);
});

// 监听存储变化，重新初始化AI服务
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.aiConfig) {
        initAIService();
    }
});

/**
 * 检查服务器是否运行（已废弃 - 插件现在完全独立运行）
 * 保留此函数以保持向后兼容，但始终返回false，因为不再需要服务器
 */
async function checkServerRunning() {
    // 插件现在完全独立运行，不需要后端服务器
    return false;
}

/**
 * 启动后台服务器
 * 由于Chrome Extension无法直接执行系统命令，这里通过调用启动脚本实现
 */
async function startServer() {
    try {
        // 尝试通过执行启动脚本来启动服务器
        // 注意：Chrome Extension无法直接执行系统命令，所以这里显示提示
        console.log('服务器未运行，需要启动服务器...');
        
        // 显示通知提示用户启动服务器
        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('assets/icons/icon48.png'),
            title: '需要启动服务器',
            message: '请在项目目录的终端运行: npm run start:web:background (详细说明请查看README.md)',
            buttons: [
                { title: '复制命令' }
            ]
        }, (notificationId) => {
            if (chrome.runtime.lastError) {
                console.error('创建通知失败:', chrome.runtime.lastError);
                return;
            }
            
            // 监听通知按钮点击（只设置一次）
            if (notificationId && chrome.notifications.onButtonClicked) {
                const listener = (clickedNotificationId, buttonIndex) => {
                    if (clickedNotificationId === notificationId && buttonIndex === 0) {
                        // 复制命令到剪贴板
                        // 注意：Chrome Extension无法直接访问剪贴板，需要通过content script
                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                            if (tabs && tabs[0]) {
                                chrome.tabs.sendMessage(tabs[0].id, {
                                    action: 'copyToClipboard',
                                    text: 'npm run start:web:background'
                                }).catch(() => {
                                    // 如果发送消息失败，忽略错误
                                    console.log('无法发送消息到content script');
                                });
                            }
                        });
                        // 移除监听器，避免重复处理
                        chrome.notifications.onButtonClicked.removeListener(listener);
                    }
                };
                chrome.notifications.onButtonClicked.addListener(listener);
            }
        });
        
        return false;
    } catch (error) {
        console.error('启动服务器失败:', error);
        return false;
    }
}

/**
 * 监听插件按钮点击事件
 * 注意：如果manifest.json中配置了default_popup，点击按钮会自动打开popup
 * 这个监听器只在没有配置default_popup时才会触发
 */
chrome.action.onClicked.addListener(async (tab) => {
    console.log('🖱️ 插件图标被点击（未配置default_popup）');
    console.log('📋 当前标签页:', tab);
    
    // 如果配置了default_popup，这个监听器不会触发
    // 如果没有配置，打开Options页面作为备选
    try {
        await chrome.runtime.openOptionsPage();
        console.log('✅ 已打开插件设置页面');
    } catch (error) {
        console.error('打开插件界面失败:', error);
    }
});

/**
 * 监听来自popup和content script的消息
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startDownload') {
        handleStartDownload(message.data).then(result => {
            sendResponse(result);
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    } else if (message.action === 'checkLoginStatus') {
        handleCheckLoginStatus().then(result => {
            sendResponse(result);
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    } else if (message.action === 'getCookies') {
        handleGetCookies(message.url).then(result => {
            sendResponse(result);
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    } else if (message.action === 'openPopup') {
        chrome.action.openPopup();
        sendResponse({ success: true });
    }
});

/**
 * 处理开始下载请求
 */
async function handleStartDownload(data) {
    const { restaurants, config } = data;
    
    if (isProcessing) {
        return { success: false, error: '已有任务正在处理中' };
    }
    
    if (!restaurants || restaurants.length === 0) {
        return { success: false, error: '餐馆列表为空' };
    }
    
    console.log('📥 收到下载请求:', {
        restaurantCount: restaurants.length,
        config: {
            maxImages: config.maxImages,
            removeWatermark: config.removeWatermark,
            enableProcessing: config.enableProcessing,
            enableAI: config.enableAI,
            hasAiConfig: !!config.aiConfig
        }
    });
    
    // 如果启用AI，确保AI服务已初始化
    if (config.enableAI && config.aiConfig) {
        console.log('🔧 检查AI服务配置...');
        // 更新AI配置（保存到local以确保持久化）
        await chrome.storage.local.set({ aiConfig: config.aiConfig });
        // 同时尝试保存到sync（用于跨设备同步，但local是主要存储）
        try {
            await chrome.storage.sync.set({ aiConfig: config.aiConfig });
        } catch (syncError) {
            console.warn('AI配置同步到sync失败（不影响使用）:', syncError);
        }
        // 重新初始化AI服务（代码已内联）
        await initAIService();
        
        if (aiServiceInstance && aiServiceInstance.isAvailable()) {
            console.log('✅ AI服务已就绪');
        } else {
            console.warn('⚠️ AI服务未就绪，AI功能将不可用');
        }
    }
    
    // 保存原始餐馆数据
    allRestaurants = restaurants.map(r => ({ ...r }));
    
    // 初始化已完成餐馆列表
    completedRestaurantsList = [];
    
    // 初始化下载队列
    downloadQueue = restaurants.map(restaurant => ({
        ...restaurant,
        status: 'pending',
        downloadedCount: 0,
        failedCount: 0
    }));
    
    downloadStats = {
        total: restaurants.length,
        completed: 0,
        success: 0,
        failed: 0
    };
    
    isProcessing = true;
    
    // 开始处理队列
    processDownloadQueue(config);
    
    return { success: true };
}

/**
 * 智能构建搜索关键词
 * 考虑餐馆名称中的地址信息和门店信息，避免重复
 * @param {string} restaurantName - 餐馆名称（可能包含地址信息）
 * @param {string} location - 地点信息
 * @returns {string} 优化后的搜索关键词
 */
function buildSearchKeyword(restaurantName, location) {
    // 门店相关关键词，用于识别门店信息
    const storeKeywords = ['店', '门店', '分店', '路', '街', '区', '市', '省', '广场', '中心', '大厦', '商场'];
    
    // 提取餐馆名称中的地址信息
    let nameParts = restaurantName ? restaurantName.trim() : '';
    let locationParts = location ? location.trim() : '';
    
    // 如果location为空或已在餐馆名称中包含，则只使用餐馆名称
    if (!locationParts || nameParts.includes(locationParts)) {
        // 餐馆名称已包含地址信息，直接使用
        return nameParts;
    }
    
    // 检查餐馆名称中是否包含门店关键词
    const nameHasStoreInfo = storeKeywords.some(keyword => nameParts.includes(keyword));
    const locationHasStoreInfo = storeKeywords.some(keyword => locationParts.includes(keyword));
    
    // 如果餐馆名称中已有门店信息，优先使用餐馆名称，location作为补充
    if (nameHasStoreInfo) {
        // 餐馆名称已包含门店信息，将location作为补充（如果location包含更多信息）
        // 提取location中的关键信息（去除与name重复的部分）
        const locationWords = locationParts.split(/[\s，,、]/).filter(word => word.length > 0);
        const nameWords = nameParts.split(/[\s，,、]/).filter(word => word.length > 0);
        
        // 找出location中不重复的关键词
        const uniqueLocationWords = locationWords.filter(word => 
            !nameWords.some(nameWord => nameWord.includes(word) || word.includes(nameWord))
        );
        
        if (uniqueLocationWords.length > 0) {
            return `${nameParts} ${uniqueLocationWords.join(' ')}`;
        }
        return nameParts;
    } else if (locationHasStoreInfo) {
        // location包含门店信息，组合使用
        return `${nameParts} ${locationParts}`;
    } else {
        // 两者都没有明显的门店信息，组合使用
        return `${nameParts} ${locationParts}`;
    }
}

/**
 * 处理下载队列
 */
async function processDownloadQueue(config) {
    while (downloadQueue.length > 0 && isProcessing) {
        const restaurant = downloadQueue.shift();
        currentTask = restaurant;
        
        try {
            // 更新状态
            restaurant.status = 'processing';
            restaurant.totalImages = config.maxImages || 6;
            restaurant.downloadedCount = 0;
            restaurant.failedCount = 0;
            restaurant.currentImageIndex = null;
            sendProgressUpdate();
            
            // 发送日志
            sendLog(`开始处理餐馆: ${restaurant.name}`, 'info');
            
            // 获取当前活动标签页
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0) {
                throw new Error('未找到活动标签页');
            }
            
            const tab = tabs[0];
            
            // 检查是否在小红书页面
            if (!tab.url.includes('xiaohongshu.com')) {
                // 智能构建搜索关键词，考虑门店信息
                let searchKeyword = buildSearchKeyword(restaurant.name, restaurant.location);
                // 如果关键词中不包含食物相关词汇，则添加"食物"关键词
                const foodKeywords = ['食物', '美食', '菜品', '菜', '吃', '美食推荐', '美食探店'];
                const hasFoodKeyword = foodKeywords.some(keyword => searchKeyword.includes(keyword));
                if (!hasFoodKeyword) {
                    searchKeyword = `${searchKeyword} 食物`;
                }
                // 打开小红书搜索页面
                const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(searchKeyword)}&type=51`;
                const newTab = await chrome.tabs.create({ url: searchUrl });
                
                // 等待页面加载
                await waitForTabLoad(newTab.id);
                
                // 额外等待确保content script已加载
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // 执行搜索
                await executeSearch(newTab.id, restaurant, config);
            } else {
                // 在当前页面执行搜索
                // 确保content script已加载
                await new Promise(resolve => setTimeout(resolve, 1000));
                await executeSearch(tab.id, restaurant, config);
            }
            
            restaurant.status = 'completed';
            downloadStats.completed++;
            downloadStats.success++;
            
            // 保存已完成的餐馆状态
            completedRestaurantsList.push({
                name: restaurant.name,
                location: restaurant.location,
                status: restaurant.status,
                downloadedCount: restaurant.downloadedCount || 0,
                failedCount: restaurant.failedCount || 0,
                totalImages: restaurant.totalImages || 0
            });
            
            sendLog(`餐馆 "${restaurant.name}" 处理完成`, 'success');
            
        } catch (error) {
            console.error('处理餐馆失败:', error);
            restaurant.status = 'failed';
            restaurant.error = error.message;
            downloadStats.completed++;
            downloadStats.failed++;
            
            // 保存失败的餐馆状态
            completedRestaurantsList.push({
                name: restaurant.name,
                location: restaurant.location,
                status: restaurant.status,
                downloadedCount: restaurant.downloadedCount || 0,
                failedCount: restaurant.failedCount || 0,
                totalImages: restaurant.totalImages || 0,
                error: restaurant.error
            });
            
            sendLog(`餐馆 "${restaurant.name}" 处理失败: ${error.message}`, 'error');
        }
        
        currentTask = null;
        sendProgressUpdate();
    }
    
    // 所有任务完成
    if (downloadQueue.length === 0) {
        isProcessing = false;
        // 清除storage中的进度数据
        chrome.storage.local.remove(['downloadProgress', 'isDownloading']).catch(() => {});
        sendDownloadComplete();
    }
}

/**
 * 安全地发送消息到content script（带重试机制）
 */
async function sendMessageToTab(tabId, message, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            // 检查标签页是否仍然存在
            const tab = await chrome.tabs.get(tabId);
            if (!tab) {
                throw new Error('标签页不存在');
            }
            
            // 检查标签页状态
            if (tab.status !== 'complete') {
                // 等待标签页加载完成
                await new Promise((resolve) => {
                    const listener = (updatedTabId, changeInfo) => {
                        if (updatedTabId === tabId && changeInfo.status === 'complete') {
                            chrome.tabs.onUpdated.removeListener(listener);
                            resolve();
                        }
                    };
                    chrome.tabs.onUpdated.addListener(listener);
                    setTimeout(() => {
                        chrome.tabs.onUpdated.removeListener(listener);
                        resolve();
                    }, 10000); // 10秒超时
                });
            }
            
            // 发送消息
            const response = await chrome.tabs.sendMessage(tabId, message);
            return response;
        } catch (error) {
            // 如果是最后一次重试，抛出错误
            if (i === retries - 1) {
                throw error;
            }
            
            // 检查是否是消息通道关闭的错误
            if (error.message && (
                error.message.includes('Receiving end does not exist') ||
                error.message.includes('message channel closed') ||
                error.message.includes('Could not establish connection')
            )) {
                // 等待一段时间后重试
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                
                // 检查content script是否已加载
                try {
                    const tab = await chrome.tabs.get(tabId);
                    if (tab && tab.url && tab.url.includes('xiaohongshu.com')) {
                        // 重新注入content script（如果需要）
                        // 注意：manifest中已声明content script，通常会自动加载
                        continue;
                    } else {
                        throw new Error('标签页不在小红书网站');
                    }
                } catch (tabError) {
                    throw new Error(`标签页错误: ${tabError.message}`);
                }
            } else {
                // 其他错误直接抛出
                throw error;
            }
        }
    }
}

/**
 * 执行搜索和下载
 */
async function executeSearch(tabId, restaurant, config) {
    // 发送搜索消息到content script（带重试）
    const searchResult = await sendMessageToTab(tabId, {
        action: 'search',
        data: {
            restaurantName: restaurant.name,
            location: restaurant.location
        }
    });
    
    if (!searchResult || !searchResult.success) {
        throw new Error(searchResult?.error || '搜索失败');
    }
    
    sendLog(`搜索完成: ${restaurant.name}`, 'info');
    
    // 等待一段时间让页面加载
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 提取图片（带重试）
    const extractResult = await sendMessageToTab(tabId, {
        action: 'extractImages',
        data: {
            maxImages: config.maxImages || 6,
            filterFaces: config.filterFaces !== false // 默认启用，除非明确设置为false
        }
    });
    
    if (!extractResult || !extractResult.success) {
        throw new Error(extractResult?.error || '提取图片失败');
    }
    
    const imageUrls = extractResult.imageUrls || [];
    sendLog(`提取到 ${imageUrls.length} 张图片`, 'info');
    
    if (imageUrls.length === 0) {
        throw new Error('未找到图片');
    }
    
    // 下载图片
    await downloadImages(imageUrls, restaurant, config);
    
    // AI分析（如果启用）
    console.log('🔍 检查AI分析条件:', {
        enableAI: config.enableAI,
        hasAiConfig: !!config.aiConfig,
        aiServiceInstanceExists: !!aiServiceInstance,
        aiServiceAvailable: aiServiceInstance ? aiServiceInstance.isAvailable() : false
    });
    
    if (config.enableAI) {
        console.log('✅ enableAI为true，准备进行AI分析');
        
        // 重新检查AI服务（配置可能已更新）
        if (!aiServiceInstance) {
            console.log('🔄 AI服务实例不存在，重新初始化...');
            // AI服务代码已内联，直接初始化
            await initAIService();
        }
        
        console.log('🔍 AI服务状态检查:', {
            instanceExists: !!aiServiceInstance,
            isAvailable: aiServiceInstance ? aiServiceInstance.isAvailable() : false,
            hasApiKey: aiServiceInstance ? !!aiServiceInstance.apiKey : false
        });
        
        if (aiServiceInstance && aiServiceInstance.isAvailable()) {
            try {
                console.log('🚀 开始AI分析流程');
                sendLog(`开始AI分析: ${restaurant.name}`, 'info');
                const aiResult = await performAIAnalysis(imageUrls, restaurant, config);
                if (aiResult && aiResult.success) {
                    sendLog(`AI分析完成: ${restaurant.name}`, 'success');
                    console.log('✅ AI分析成功完成');
                } else {
                    console.warn('⚠️ AI分析返回失败:', aiResult);
                    sendLog(`AI分析失败: ${aiResult?.error || '未知错误'}`, 'error');
                }
            } catch (error) {
                console.error('❌ AI分析异常:', error);
                console.error('错误堆栈:', error.stack);
                sendLog(`AI分析失败: ${error.message}`, 'error');
            }
        } else {
            const reason = !aiServiceInstance ? 'AI服务实例未创建' : 'AI服务不可用（可能未配置API密钥）';
            console.warn('⚠️ 跳过AI分析:', reason);
            sendLog(`AI服务未配置，跳过AI分析: ${reason}`, 'warning');
        }
    } else {
        console.log('ℹ️ enableAI为false，跳过AI分析');
    }
}

/**
 * 下载图片（支持图片处理去水印）
 */
async function downloadImages(imageUrls, restaurant, config) {
    const maxImages = Math.min(imageUrls.length, config.maxImages || 6);
    let downloadedCount = 0;
    let failedCount = 0;
    
    // 初始化图片进度
    restaurant.totalImages = maxImages;
    restaurant.downloadedCount = 0;
    restaurant.failedCount = 0;
    
    for (let i = 0; i < maxImages; i++) {
        const imageUrl = imageUrls[i];
        
        // 更新当前图片索引
        restaurant.currentImageIndex = i + 1;
        sendProgressUpdate();
        
        try {
            let finalUrl = imageUrl;
            
            // 如果启用了去水印，需要在Content Script中处理图片
            if (config.removeWatermark || config.enableProcessing) {
                // 找到小红书标签页
                const tabs = await chrome.tabs.query({ 
                    url: ['https://www.xiaohongshu.com/*', 'https://*.xiaohongshu.com/*'] 
                });
                
                if (tabs.length > 0) {
                    // 在Content Script中处理图片（带重试）
                    const processedResult = await sendMessageToTab(tabs[0].id, {
                        action: 'processImage',
                        data: {
                            imageUrl: imageUrl,
                            removeWatermark: config.removeWatermark || false,
                            enableProcessing: config.enableProcessing || false
                        }
                    });
                    
                    if (processedResult && processedResult.success && processedResult.blobUrl) {
                        finalUrl = processedResult.blobUrl;
                    } else {
                        // 如果处理失败，使用原始URL（移除水印参数）
                        finalUrl = removeWatermarkParams(imageUrl);
                    }
                } else {
                    // 没有小红书标签页，只移除URL参数
                    finalUrl = removeWatermarkParams(imageUrl);
                }
            } else {
                // 不处理，只移除URL参数
                finalUrl = removeWatermarkParams(imageUrl);
            }
            
            // 生成文件名
            const filename = generateFilename(restaurant.name, i + 1, finalUrl);
            
            console.log(`📥 开始下载图片 ${i + 1}/${maxImages}:`, {
                url: finalUrl.substring(0, 100) + '...',
                filename: filename
            });
            
            // 使用Chrome下载API下载
            const downloadId = await new Promise((resolve, reject) => {
                chrome.downloads.download({
                    url: finalUrl,
                    filename: filename,
                    saveAs: false
                }, (id) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(id);
                    }
                });
            });
            
            console.log(`✅ 图片 ${i + 1} 下载已启动，下载ID:`, downloadId);
            downloadedCount++;
            restaurant.downloadedCount = downloadedCount;
            
            // 发送日志和进度更新（这些函数已经处理了popup关闭的情况）
            try {
                sendLog(`已下载图片 ${i + 1}/${maxImages}`, 'success');
            } catch (logError) {
                // 静默处理日志发送错误
                console.log(`已下载图片 ${i + 1}/${maxImages}`);
            }
            
            // 发送进度更新
            try {
                sendProgressUpdate();
            } catch (progressError) {
                // 静默处理进度更新错误
            }
            
            // 延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            // 检查是否是连接错误（popup关闭导致的）
            const isConnectionError = error.message && (
                error.message.includes('Receiving end does not exist') ||
                error.message.includes('message channel closed') ||
                error.message.includes('Could not establish connection')
            );
            
            if (isConnectionError) {
                // 连接错误通常是popup关闭导致的，不影响下载功能
                // 只记录到控制台，不记录为下载失败
                console.log(`下载图片 ${i + 1} 时popup已关闭（不影响下载）`);
                // 继续处理，不增加失败计数
                continue;
            }
            
            // 真正的下载错误才记录
            console.error('下载图片失败:', error);
            failedCount++;
            restaurant.failedCount = failedCount;
            
            // 记录错误到控制台
            console.log(`下载图片 ${i + 1} 失败: ${error.message}`);
            
            // 发送进度更新（这个函数已经处理了popup关闭的情况）
            sendProgressUpdate();
        }
    }
    
    // 下载完成，清除当前图片索引
    restaurant.currentImageIndex = null;
    restaurant.downloadedCount = downloadedCount;
    restaurant.failedCount = failedCount;
    sendProgressUpdate();
}

/**
 * 生成文件名
 */
function generateFilename(restaurantName, index, url) {
    // 清理文件名中的非法字符
    const cleanName = restaurantName.replace(/[<>:"/\\|?*]/g, '_');
    
    // 获取文件扩展名
    let ext = 'jpg';
    try {
        // 如果是blob URL，使用默认扩展名
        if (url.startsWith('blob:')) {
            ext = 'jpg';
        } else {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const match = pathname.match(/\.(jpg|jpeg|png|gif|webp)$/i);
            if (match) {
                ext = match[1].toLowerCase();
            }
        }
    } catch (e) {
        // 使用默认扩展名
        console.warn('无法从URL获取扩展名，使用默认jpg:', e.message);
    }
    
    const filename = `downloads/${cleanName}/image_${String(index).padStart(3, '0')}.${ext}`;
    console.log('📝 生成文件名:', filename);
    return filename;
}

/**
 * 移除水印参数
 */
function removeWatermarkParams(url) {
    try {
        const urlObj = new URL(url);
        const watermarkParams = ['watermark', 'wm', 'mark', 'logo', 'w', 'h', 'width', 'height', 'compress', 'resize', 'crop'];
        watermarkParams.forEach(param => {
            urlObj.searchParams.delete(param);
        });
        return urlObj.toString();
    } catch (error) {
        return url;
    }
}

/**
 * 检查登录状态（使用Chrome Cookies API）
 */
async function handleCheckLoginStatus() {
    try {
        // 获取小红书网站的Cookie
        const cookies = await chrome.cookies.getAll({
            domain: '.xiaohongshu.com'
        });
        
        // 检查是否有有效的登录Cookie
        const hasValidCookies = cookies.length > 0;
        
        // 检查关键Cookie（登录状态相关）
        const keyCookieNames = ['web_session', 'a1', 'webId', 'websectiga', 'sec_poison_id'];
        const hasKeyCookies = cookies.some(cookie => 
            keyCookieNames.some(name => cookie.name.includes(name))
        );
        
        // 尝试获取小红书标签页检查页面登录状态
        const tabs = await chrome.tabs.query({ 
            url: ['https://www.xiaohongshu.com/*', 'https://*.xiaohongshu.com/*'] 
        });
        
        let pageLoggedIn = false;
        if (tabs.length > 0) {
            try {
                const result = await chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'checkLoginStatus'
                });
                pageLoggedIn = result?.loggedIn || false;
            } catch (error) {
                // Content script可能未加载，忽略错误
                console.log('无法检查页面登录状态（可能未在小红书页面）:', error.message);
            }
        }
        
        // 综合判断：有Cookie且（有关键Cookie或页面显示已登录）
        const loggedIn = hasValidCookies && (hasKeyCookies || pageLoggedIn);
        
        // 计算登录评分（0-10）
        let loginScore = 0;
        if (hasValidCookies) {
            loginScore += 2; // 有Cookie基础分
            if (hasKeyCookies) loginScore += 3; // 有关键Cookie
            if (pageLoggedIn) loginScore += 5; // 页面确认已登录
        }
        
        return {
            success: true,
            loggedIn,
            loginScore,
            cookieCount: cookies.length,
            hasKeyCookies,
            pageLoggedIn
        };
    } catch (error) {
        console.error('检查登录状态失败:', error);
        return {
            success: false,
            error: error.message,
            loggedIn: false,
            loginScore: 0
        };
    }
}

/**
 * 获取Cookie
 */
async function handleGetCookies(url) {
    try {
        const domain = new URL(url).hostname;
        const cookies = await chrome.cookies.getAll({
            domain: domain.startsWith('.') ? domain : '.' + domain
        });
        
        return {
            success: true,
            cookies: cookies
        };
    } catch (error) {
        console.error('获取Cookie失败:', error);
        return {
            success: false,
            error: error.message,
            cookies: []
        };
    }
}

/**
 * 等待标签页加载完成
 */
function waitForTabLoad(tabId) {
    return new Promise((resolve) => {
        const listener = (updatedTabId, changeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                setTimeout(resolve, 2000); // 额外等待2秒确保内容加载
            }
        };
        chrome.tabs.onUpdated.addListener(listener);
        
        // 超时保护
        setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
        }, 30000);
    });
}

/**
 * 发送进度更新
 */
function sendProgressUpdate() {
    // 构建当前任务数据，包含图片进度信息
    const currentTaskData = currentTask ? {
        name: currentTask.name,
        location: currentTask.location,
        status: currentTask.status,
        downloadedCount: currentTask.downloadedCount || 0,
        failedCount: currentTask.failedCount || 0,
        totalImages: currentTask.totalImages || 0,
        currentImageIndex: currentTask.currentImageIndex || null
    } : null;
    
    const progressData = {
        total: downloadStats.total,
        completed: downloadStats.completed,
        success: downloadStats.success,
        failed: downloadStats.failed,
        current: currentTaskData
    };
    
    // 尝试发送消息到popup
    chrome.runtime.sendMessage({
        action: 'downloadProgress',
        data: progressData
    }).catch((error) => {
        // 忽略错误（popup可能未打开）
        // 这是正常情况，不需要记录错误
        if (error.message && !error.message.includes('Receiving end does not exist')) {
            // 只有非预期的错误才记录
            console.warn('发送进度更新失败:', error.message);
        }
    });
    
    // 同时保存到storage，以便popup打开时可以读取
    chrome.storage.local.set({ 
        downloadProgress: progressData,
        isDownloading: isProcessing
    }).catch(err => {
        console.error('保存进度数据失败:', err);
    });
}

/**
 * 发送日志
 */
function sendLog(message, level = 'info') {
    // 尝试发送消息到popup，如果popup未打开则忽略错误
    chrome.runtime.sendMessage({
        action: 'downloadLog',
        data: {
            message,
            level
        }
    }).catch((error) => {
        // 忽略错误（popup可能未打开）
        // 这是正常情况，不需要记录错误
        if (error.message && !error.message.includes('Receiving end does not exist')) {
            // 只有非预期的错误才记录
            console.warn('发送日志消息失败:', error.message);
        }
    });
}

/**
 * 发送下载完成通知
 */
function sendDownloadComplete() {
    // 构建包含所有餐馆状态的完成数据
    const completeData = {
        ...downloadStats,
        restaurants: completedRestaurantsList // 包含所有餐馆的最终状态
    };
    
    chrome.runtime.sendMessage({
        action: 'downloadComplete',
        data: completeData
    }).catch((error) => {
        // 忽略错误（popup可能未打开）
        // 这是正常情况，不需要记录错误
        if (error.message && !error.message.includes('Receiving end does not exist')) {
            // 只有非预期的错误才记录
            console.warn('发送完成通知失败:', error.message);
        }
    });
    
    // 同时保存到storage
    chrome.storage.local.set({
        downloadComplete: completeData
    }).catch(err => {
        console.error('保存完成数据失败:', err);
    });
}

// 监听下载事件
chrome.downloads.onChanged.addListener((downloadDelta) => {
    if (downloadDelta.state && downloadDelta.state.current === 'complete') {
        console.log('✅ 下载完成:', downloadDelta.id);
        chrome.downloads.search({ id: downloadDelta.id }, (results) => {
            if (results && results[0]) {
                console.log('📁 文件已保存到:', results[0].filename);
            }
        });
    } else if (downloadDelta.state && downloadDelta.state.current === 'interrupted') {
        console.error('❌ 下载中断:', downloadDelta.id);
        if (downloadDelta.error) {
            console.error('错误原因:', downloadDelta.error.current);
        }
    } else if (downloadDelta.error) {
        console.error('❌ 下载错误:', downloadDelta.id, downloadDelta.error.current);
    }
});

/**
 * 执行AI分析
 */
async function performAIAnalysis(imageUrls, restaurant, config) {
    console.log('🤖 开始AI分析流程:', {
        restaurant: restaurant.name,
        imageCount: imageUrls.length,
        aiServiceAvailable: aiServiceInstance && aiServiceInstance.isAvailable()
    });
    
    if (!aiServiceInstance || !aiServiceInstance.isAvailable()) {
        const errorMsg = 'AI服务未启用或未配置API密钥';
        console.warn('⚠️', errorMsg);
        sendLog(errorMsg, 'warning');
        return { success: false, error: errorMsg };
    }
    
    try {
        // 更新请求队列配置
        const options = await chrome.storage.sync.get(['options']);
        if (options.options) {
            aiRequestQueue.setConfig({
                aiRequestDelay: options.options.aiRequestDelay,
                aiRequestRetries: options.options.aiRequestRetries
            });
        }
        
        // 分析图片（最多分析5张）
        const imagesToAnalyze = imageUrls.slice(0, 5);
        sendLog(`正在分析 ${imagesToAnalyze.length} 张图片...`, 'info');
        console.log('🖼️ 开始分析图片，数量:', imagesToAnalyze.length);
        
        const analysisResults = [];
        for (let i = 0; i < imagesToAnalyze.length; i++) {
            try {
                sendLog(`分析图片 ${i + 1}/${imagesToAnalyze.length}...`, 'info');
                console.log(`📸 分析图片 ${i + 1}:`, imagesToAnalyze[i]);
                
                // 使用请求队列处理图片分析，确保串行执行
                const result = await aiRequestQueue.enqueue(
                    () => aiServiceInstance.analyzeImages(
                        imagesToAnalyze[i],
                        '请详细分析这张餐馆图片，包括：1.菜品特色 2.环境氛围 3.装修风格 4.推荐亮点 5.适合场景'
                    ),
                    `分析图片 ${i + 1}/${imagesToAnalyze.length}`
                );
                
                if (result && result.success && result.content) {
                    analysisResults.push(result);
                    sendLog(`图片 ${i + 1} 分析完成`, 'success');
                    console.log(`✅ 图片 ${i + 1} 分析完成，内容长度:`, result.content.length);
                } else {
                    console.warn(`⚠️ 图片 ${i + 1} 分析结果异常:`, result);
                    sendLog(`图片 ${i + 1} 分析结果异常`, 'warning');
                }
            } catch (error) {
                console.error(`❌ 分析图片 ${i + 1} 失败:`, error);
                sendLog(`分析图片 ${i + 1} 失败: ${error.message}`, 'error');
            }
        }
        
        console.log('📊 分析结果统计:', {
            total: imagesToAnalyze.length,
            success: analysisResults.length
        });
        
        if (analysisResults.length === 0) {
            const errorMsg = '没有成功分析的图片';
            console.error('❌', errorMsg);
            sendLog(errorMsg, 'error');
            return { success: false, error: errorMsg };
        }
        
        // 生成评语（使用请求队列）
        sendLog('正在生成评语...', 'info');
        console.log('📝 开始生成评语，餐馆:', restaurant.name);
        
        const reviewResult = await aiRequestQueue.enqueue(
            () => aiServiceInstance.generateReview(
                analysisResults,
                restaurant.name,
                restaurant.location || ''
            ),
            `生成评语: ${restaurant.name}`
        );
        
        if (reviewResult.success && reviewResult.review) {
            // 保存评语到下载目录
            const cleanName = restaurant.name.replace(/[<>:"/\\|?*]/g, '_');
            const filename = `downloads/${cleanName}/评语.md`;
            
            console.log('💾 保存评语到:', filename);
            sendLog(`保存评语到: ${filename}`, 'info');
            
            // 在Service Worker中，不能使用URL.createObjectURL
            // 使用data URL来下载文本文件
            try {
                // 将文本内容编码为base64
                const textContent = reviewResult.review;
                const base64Content = btoa(unescape(encodeURIComponent(textContent)));
                const dataUrl = `data:text/plain;charset=utf-8;base64,${base64Content}`;
                
                console.log('📄 创建data URL，内容长度:', textContent.length);
                
                await chrome.downloads.download({
                    url: dataUrl,
                    filename: filename,
                    saveAs: false
                });
                
                sendLog('评语已保存', 'success');
                console.log('✅ 评语已保存:', filename);
            } catch (downloadError) {
                console.error('❌ 保存评语文件失败:', downloadError);
                sendLog(`保存评语失败: ${downloadError.message}`, 'error');
                throw downloadError;
            }
        } else {
            const errorMsg = reviewResult.error || '生成评语失败';
            console.error('❌', errorMsg, reviewResult);
            sendLog(errorMsg, 'error');
            return { success: false, error: errorMsg };
        }
        
        return {
            success: true,
            analysisResults,
            review: reviewResult.review
        };
    } catch (error) {
        console.error('❌ AI分析失败:', error);
        sendLog(`AI分析失败: ${error.message}`, 'error');
        return {
            success: false,
            error: error.message
        };
    }
}

console.log('Background Script 已加载');


