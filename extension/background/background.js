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
        
        const result = await chrome.storage.sync.get(['aiConfig']);
        const aiConfig = result.aiConfig;
        
        console.log('🔍 检查AI配置:', {
            hasConfig: !!aiConfig,
            enabled: aiConfig?.enabled,
            hasApiKey: !!aiConfig?.apiKey,
            apiKeyLength: aiConfig?.apiKey?.length || 0
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

// 初始化AI服务
async function initAIService() {
    try {
        // 如果 AIService 未加载，跳过初始化
        if (!AIService || typeof AIService === 'undefined') {
            console.log('AI服务未加载，跳过初始化');
            return;
        }
        
        const aiConfig = await chrome.storage.sync.get(['aiConfig']);
        if (aiConfig.aiConfig && aiConfig.aiConfig.enabled && aiConfig.aiConfig.apiKey) {
            try {
                aiServiceInstance = new AIService(aiConfig.aiConfig);
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
        // 更新AI配置
        await chrome.storage.sync.set({ aiConfig: config.aiConfig });
        // 重新初始化AI服务（代码已内联）
        await initAIService();
        
        if (aiServiceInstance && aiServiceInstance.isAvailable()) {
            console.log('✅ AI服务已就绪');
        } else {
            console.warn('⚠️ AI服务未就绪，AI功能将不可用');
        }
    }
    
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
 * 处理下载队列
 */
async function processDownloadQueue(config) {
    while (downloadQueue.length > 0 && isProcessing) {
        const restaurant = downloadQueue.shift();
        currentTask = restaurant;
        
        try {
            // 更新状态
            restaurant.status = 'processing';
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
                // 打开小红书搜索页面
                const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(restaurant.name + (restaurant.location ? ' ' + restaurant.location : ''))}&type=51`;
                const newTab = await chrome.tabs.create({ url: searchUrl });
                
                // 等待页面加载
                await waitForTabLoad(newTab.id);
                
                // 执行搜索
                await executeSearch(newTab.id, restaurant, config);
            } else {
                // 在当前页面执行搜索
                await executeSearch(tab.id, restaurant, config);
            }
            
            restaurant.status = 'completed';
            downloadStats.completed++;
            downloadStats.success++;
            
            sendLog(`餐馆 "${restaurant.name}" 处理完成`, 'success');
            
        } catch (error) {
            console.error('处理餐馆失败:', error);
            restaurant.status = 'failed';
            restaurant.error = error.message;
            downloadStats.completed++;
            downloadStats.failed++;
            
            sendLog(`餐馆 "${restaurant.name}" 处理失败: ${error.message}`, 'error');
        }
        
        currentTask = null;
        sendProgressUpdate();
    }
    
    // 所有任务完成
    if (downloadQueue.length === 0) {
        isProcessing = false;
        sendDownloadComplete();
    }
}

/**
 * 执行搜索和下载
 */
async function executeSearch(tabId, restaurant, config) {
    // 发送搜索消息到content script
    const searchResult = await chrome.tabs.sendMessage(tabId, {
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
    
    // 提取图片
    const extractResult = await chrome.tabs.sendMessage(tabId, {
        action: 'extractImages',
        data: {
            maxImages: config.maxImages || 6
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
    
    for (let i = 0; i < maxImages; i++) {
        const imageUrl = imageUrls[i];
        
        try {
            let finalUrl = imageUrl;
            
            // 如果启用了去水印，需要在Content Script中处理图片
            if (config.removeWatermark || config.enableProcessing) {
                // 找到小红书标签页
                const tabs = await chrome.tabs.query({ 
                    url: ['https://www.xiaohongshu.com/*', 'https://*.xiaohongshu.com/*'] 
                });
                
                if (tabs.length > 0) {
                    // 在Content Script中处理图片
                    const processedResult = await chrome.tabs.sendMessage(tabs[0].id, {
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
            sendLog(`已下载图片 ${i + 1}/${maxImages}`, 'success');
            
            // 延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error('下载图片失败:', error);
            failedCount++;
            sendLog(`下载图片 ${i + 1} 失败: ${error.message}`, 'error');
        }
    }
    
    restaurant.downloadedCount = downloadedCount;
    restaurant.failedCount = failedCount;
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
    chrome.runtime.sendMessage({
        action: 'downloadProgress',
        data: {
            total: downloadStats.total,
            completed: downloadStats.completed,
            success: downloadStats.success,
            failed: downloadStats.failed,
            current: currentTask
        }
    }).catch(() => {
        // 忽略错误（popup可能未打开）
    });
}

/**
 * 发送日志
 */
function sendLog(message, level = 'info') {
    chrome.runtime.sendMessage({
        action: 'downloadLog',
        data: {
            message,
            level
        }
    }).catch(() => {
        // 忽略错误（popup可能未打开）
    });
}

/**
 * 发送下载完成通知
 */
function sendDownloadComplete() {
    chrome.runtime.sendMessage({
        action: 'downloadComplete',
        data: downloadStats
    }).catch(() => {
        // 忽略错误（popup可能未打开）
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
        // 分析图片（最多分析5张）
        const imagesToAnalyze = imageUrls.slice(0, 5);
        sendLog(`正在分析 ${imagesToAnalyze.length} 张图片...`, 'info');
        console.log('🖼️ 开始分析图片，数量:', imagesToAnalyze.length);
        
        const analysisResults = [];
        for (let i = 0; i < imagesToAnalyze.length; i++) {
            try {
                sendLog(`分析图片 ${i + 1}/${imagesToAnalyze.length}...`, 'info');
                console.log(`📸 分析图片 ${i + 1}:`, imagesToAnalyze[i]);
                
                const result = await aiServiceInstance.analyzeImages(
                    imagesToAnalyze[i],
                    '请详细分析这张餐馆图片，包括：1.菜品特色 2.环境氛围 3.装修风格 4.推荐亮点 5.适合场景'
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
        
        // 生成评语
        sendLog('正在生成评语...', 'info');
        console.log('📝 开始生成评语，餐馆:', restaurant.name);
        
        const reviewResult = await aiServiceInstance.generateReview(
            analysisResults,
            restaurant.name,
            restaurant.location || ''
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


