/**
 * Background Script - Service Worker
 * 处理下载管理、任务队列、消息传递等
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

// 注意：Service Worker中通过importScripts加载AI服务
// AIService类会在importScripts加载后可用
let aiServiceInstance = null;

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
        const aiConfig = await chrome.storage.sync.get(['aiConfig']);
        if (aiConfig.aiConfig && aiConfig.aiConfig.enabled && aiConfig.aiConfig.apiKey) {
            // 使用全局AIService类（通过importScripts加载）
            if (typeof AIService !== 'undefined') {
                aiServiceInstance = new AIService(aiConfig.aiConfig);
                console.log('AI服务已初始化');
            } else {
                console.warn('AIService类未加载，请检查importScripts配置');
            }
        }
    } catch (error) {
        console.error('初始化AI服务失败:', error);
    }
}

// 初始化
initAIService();

/**
 * 监听插件按钮点击事件 - 打开网页界面
 */
chrome.action.onClicked.addListener(async (tab) => {
    try {
        const webInterfaceUrl = 'http://localhost:3000';
        
        // 检查是否已经打开了该URL的标签页
        // 注意：需要匹配完整的URL模式
        const tabs = await chrome.tabs.query({ 
            url: ['http://localhost:3000/*', 'http://127.0.0.1:3000/*']
        });
        
        if (tabs.length > 0) {
            // 如果已经打开，激活该标签页
            await chrome.tabs.update(tabs[0].id, { active: true });
            await chrome.windows.update(tabs[0].windowId, { focused: true });
            console.log('✅ 已激活Web界面标签页');
        } else {
            // 如果没有打开，创建新标签页
            const newTab = await chrome.tabs.create({ url: webInterfaceUrl });
            console.log('✅ 已打开Web界面:', webInterfaceUrl);
            
            // 监听标签页加载状态，如果加载失败，提示用户
            const checkTabStatus = (tabId, changeInfo) => {
                if (tabId === newTab.id && changeInfo.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(checkTabStatus);
                    
                    // 延迟检查，给页面一些时间加载
                    setTimeout(async () => {
                        try {
                            const updatedTab = await chrome.tabs.get(tabId);
                            // 如果URL变成错误页面，说明服务器未运行
                            if (updatedTab.url && updatedTab.url.startsWith('chrome-error://')) {
                                // 显示通知提示用户启动服务器
                                chrome.notifications.create({
                                    type: 'basic',
                                    iconUrl: chrome.runtime.getURL('assets/icons/icon48.png'),
                                    title: 'Web界面无法打开',
                                    message: '请先运行 npm run start:web 启动Web界面服务器'
                                });
                            }
                        } catch (error) {
                            // 忽略错误（标签页可能已关闭）
                            console.log('检查标签页状态时出错:', error);
                        }
                    }, 2000); // 等待2秒后检查
                }
            };
            
            chrome.tabs.onUpdated.addListener(checkTabStatus);
        }
    } catch (error) {
        console.error('打开网页界面失败:', error);
        // 显示错误通知
        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('assets/icons/icon48.png'),
            title: '打开Web界面失败',
            message: '请确保Web界面服务器已启动 (npm run start:web)'
        });
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
    if (config.enableAI && aiServiceInstance && aiServiceInstance.isAvailable()) {
        try {
            sendLog(`开始AI分析: ${restaurant.name}`, 'info');
            const aiResult = await performAIAnalysis(imageUrls, restaurant, config);
            if (aiResult && aiResult.success) {
                sendLog(`AI分析完成: ${restaurant.name}`, 'success');
            }
        } catch (error) {
            console.error('AI分析失败:', error);
            sendLog(`AI分析失败: ${error.message}`, 'error');
        }
    }
}

/**
 * 下载图片
 */
async function downloadImages(imageUrls, restaurant, config) {
    const maxImages = Math.min(imageUrls.length, config.maxImages || 6);
    let downloadedCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < maxImages; i++) {
        const imageUrl = imageUrls[i];
        
        try {
            // 处理水印去除（如果需要）
            let finalUrl = imageUrl;
            if (config.removeWatermark) {
                finalUrl = removeWatermarkParams(imageUrl);
            }
            
            // 生成文件名
            const filename = generateFilename(restaurant.name, i + 1, finalUrl);
            
            // 使用Chrome下载API下载
            await chrome.downloads.download({
                url: finalUrl,
                filename: filename,
                saveAs: false
            });
            
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
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const match = pathname.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        if (match) {
            ext = match[1].toLowerCase();
        }
    } catch (e) {
        // 使用默认扩展名
    }
    
    return `downloads/${cleanName}/image_${String(index).padStart(3, '0')}.${ext}`;
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
 * 检查登录状态
 */
async function handleCheckLoginStatus() {
    try {
        // 获取小红书网站的Cookie
        const cookies = await chrome.cookies.getAll({
            domain: '.xiaohongshu.com'
        });
        
        // 检查是否有有效的登录Cookie
        const hasValidCookies = cookies.length > 0;
        const hasSessionCookie = cookies.some(cookie => 
            cookie.name.includes('session') || 
            cookie.name.includes('token') || 
            cookie.name.includes('web_session')
        );
        
        // 尝试获取当前活动标签页检查登录状态
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        let pageLoggedIn = false;
        
        if (tabs.length > 0 && tabs[0].url.includes('xiaohongshu.com')) {
            try {
                const result = await chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'checkLoginStatus'
                });
                pageLoggedIn = result?.loggedIn || false;
            } catch (error) {
                // Content script可能未加载
                console.log('无法检查页面登录状态:', error);
            }
        }
        
        const loggedIn = hasValidCookies && (hasSessionCookie || pageLoggedIn);
        
        return {
            success: true,
            loggedIn,
            cookieCount: cookies.length,
            hasSessionCookie
        };
    } catch (error) {
        console.error('检查登录状态失败:', error);
        return {
            success: false,
            error: error.message,
            loggedIn: false
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
        console.log('下载完成:', downloadDelta.id);
    } else if (downloadDelta.state && downloadDelta.state.current === 'interrupted') {
        console.log('下载中断:', downloadDelta.id);
    }
});

/**
 * 执行AI分析
 */
async function performAIAnalysis(imageUrls, restaurant, config) {
    if (!aiServiceInstance || !aiServiceInstance.isAvailable()) {
        return { success: false, error: 'AI服务未启用' };
    }
    
    try {
        // 分析图片
        const analysisResults = await aiServiceInstance.analyzeImages(
            imageUrls.slice(0, 5), // 最多分析5张图片
            '请详细分析这张餐馆图片，包括：1.菜品特色 2.环境氛围 3.装修风格 4.推荐亮点 5.适合场景'
        );
        
        // 生成评语
        const reviewResult = await aiServiceInstance.generateReview(
            analysisResults,
            restaurant.name,
            restaurant.location || ''
        );
        
        if (reviewResult.success) {
            // 保存评语到下载目录
            const filename = `downloads/${restaurant.name.replace(/[<>:"/\\|?*]/g, '_')}/评语.md`;
            // 注意：Chrome插件中无法直接写入文件，需要通过下载API保存
            const blob = new Blob([reviewResult.review], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            await chrome.downloads.download({
                url: url,
                filename: filename,
                saveAs: false
            });
            
            URL.revokeObjectURL(url);
        }
        
        return {
            success: true,
            analysisResults,
            review: reviewResult.review
        };
    } catch (error) {
        console.error('AI分析失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 监听存储变化，重新初始化AI服务
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.aiConfig) {
        initAIService();
    }
});

console.log('Background Script 已加载');

