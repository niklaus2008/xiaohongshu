/**
 * Popup界面主脚本
 * 处理用户交互、配置管理和下载控制
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

// 全局状态
let restaurants = [];
let config = {
    maxImages: 6,
    removeWatermark: true,
    enableProcessing: true
};
let isDownloading = false;
let currentTask = null;
let currentProgress = null; // 存储当前进度数据

// DOM元素
const elements = {
    maxImages: document.getElementById('maxImages'),
    removeWatermark: document.getElementById('removeWatermark'),
    startDownloadBtn: document.getElementById('startDownloadBtn'),
    addRestaurantBtn: document.getElementById('addRestaurantBtn'),
    importBtn: document.getElementById('importBtn'),
    restaurantList: document.getElementById('restaurantList'),
    progressSection: document.getElementById('progressSection'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    currentTask: document.getElementById('currentTask'),
    progressDetails: document.getElementById('progressDetails'),
    logSection: document.getElementById('logSection'),
    logContainer: document.getElementById('logContainer'),
    logLevel: document.getElementById('logLevel'),
    clearLogBtn: document.getElementById('clearLogBtn'),
    helpBtn: document.getElementById('helpBtn'),
    configToggle: document.getElementById('configToggle'),
    configContent: document.getElementById('configContent'),
    advancedToggle: document.getElementById('advancedToggle'),
    advancedContent: document.getElementById('advancedContent'),
    // 高级设置元素
    aiEnabled: document.getElementById('aiEnabled'),
    aiApiKey: document.getElementById('aiApiKey'),
    aiApiUrl: document.getElementById('aiApiUrl'),
    aiModel: document.getElementById('aiModel'),
    aiRequestDelay: document.getElementById('aiRequestDelay'),
    aiRequestRetries: document.getElementById('aiRequestRetries'),
    defaultDownloadPath: document.getElementById('defaultDownloadPath'),
    downloadDelay: document.getElementById('downloadDelay'),
    autoRemoveWatermark: document.getElementById('autoRemoveWatermark'),
    autoProcessImage: document.getElementById('autoProcessImage'),
    showNotifications: document.getElementById('showNotifications'),
    autoOpenFolder: document.getElementById('autoOpenFolder'),
    addRestaurantModal: document.getElementById('addRestaurantModal'),
    restaurantName: document.getElementById('restaurantName'),
    restaurantLocation: document.getElementById('restaurantLocation'),
    confirmAddBtn: document.getElementById('confirmAddBtn'),
    cancelAddBtn: document.getElementById('cancelAddBtn'),
    closeModalBtn: document.getElementById('closeModalBtn')
};

/**
 * 初始化
 */
async function init() {
    console.log('初始化Popup界面...');
    
    try {
        // 1. 先加载所有配置（确保配置完全加载）
        await loadConfig();
        await loadAdvancedConfig();
        await loadRestaurants();
        
        // 2. 检查是否有正在进行的下载任务
        await checkDownloadStatus();
        
        // 3. 配置加载完成后再绑定事件（避免事件触发时配置未加载）
        bindEvents();
        
        // 4. 设置配置同步监听
        setupConfigSync();
        
        // 5. 监听消息
        setupMessageListeners();
        
        // 6. 更新UI
        updateUI();
        
        console.log('✅ Popup界面初始化完成');
    } catch (error) {
        console.error('❌ Popup界面初始化失败:', error);
        addLog('初始化失败: ' + error.message, 'error');
    }
}

/**
 * 设置配置同步监听
 */
function setupConfigSync() {
    // 监听storage变化，自动更新UI
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'sync') {
            // 配置变化
            if (changes.config) {
                console.log('检测到配置变化，重新加载...');
                loadConfig().then(() => {
                    updateUI();
                });
            }
            
            // AI配置变化（从sync，需要迁移到local）
            if (changes.aiConfig) {
                console.log('检测到AI配置变化（sync），迁移到local...');
                // 将sync的配置迁移到local
                chrome.storage.sync.get(['aiConfig']).then(result => {
                    if (result.aiConfig) {
                        chrome.storage.local.set({ aiConfig: result.aiConfig });
                        chrome.storage.sync.remove(['aiConfig']);
                    }
                });
                loadAdvancedConfig();
            }
        }
        
        // 监听local存储变化（AI配置主要存储在local）
        if (areaName === 'local') {
            // AI配置变化（从local）
            if (changes.aiConfig) {
                console.log('检测到AI配置变化（local），重新加载...');
                loadAdvancedConfig();
            }
            
            // 选项配置变化
            if (changes.options) {
                console.log('检测到选项配置变化，重新加载...');
                loadAdvancedConfig();
            }
        }
        
        // 餐馆列表变化（local storage）
        if (areaName === 'local' && changes.restaurants) {
            console.log('检测到餐馆列表变化，重新加载...');
            loadRestaurants().then(() => {
                updateUI();
            });
        }
    });
}

/**
 * 检查下载状态
 */
async function checkDownloadStatus() {
    try {
        const result = await chrome.storage.local.get(['downloadProgress', 'isDownloading', 'downloadComplete']);
        
        // 检查是否有已完成的下载任务（但状态未同步）
        if (result.downloadComplete && result.downloadComplete.restaurants) {
            // 同步餐馆状态
            result.downloadComplete.restaurants.forEach(completedRestaurant => {
                const index = restaurants.findIndex(r => 
                    r.name === completedRestaurant.name && 
                    r.location === completedRestaurant.location
                );
                
                if (index !== -1) {
                    restaurants[index].status = completedRestaurant.status;
                    restaurants[index].downloadedCount = completedRestaurant.downloadedCount || 0;
                    restaurants[index].failedCount = completedRestaurant.failedCount || 0;
                    restaurants[index].totalImages = completedRestaurant.totalImages || 0;
                }
            });
            
            // 确保下载状态为false，按钮可用
            isDownloading = false;
            elements.startDownloadBtn.disabled = false;
            updateStartButton();
            
            // 清除完成数据
            chrome.storage.local.remove(['downloadComplete']).catch(() => {});
            saveRestaurants();
            renderRestaurantList();
        }
        
        // 检查是否有正在进行的下载任务
        if (result.isDownloading && result.downloadProgress) {
            // 有正在进行的下载任务，显示进度
            isDownloading = true;
            elements.progressSection.style.display = 'block';
            elements.logSection.style.display = 'block';
            elements.startDownloadBtn.disabled = true;
            updateProgress(result.downloadProgress);
        }
    } catch (error) {
        console.error('检查下载状态失败:', error);
    }
}

/**
 * 获取默认配置
 */
function getDefaultConfig() {
    return {
        maxImages: 6,
        removeWatermark: true,
        enableProcessing: true
    };
}

/**
 * 验证配置完整性
 */
function validateConfig(configData) {
    const defaultConfig = getDefaultConfig();
    const validated = { ...defaultConfig, ...configData };
    
    // 验证必需字段
    if (typeof validated.maxImages !== 'number' || validated.maxImages < 1) {
        validated.maxImages = defaultConfig.maxImages;
    }
    if (typeof validated.removeWatermark !== 'boolean') {
        validated.removeWatermark = defaultConfig.removeWatermark;
    }
    if (typeof validated.enableProcessing !== 'boolean') {
        validated.enableProcessing = defaultConfig.enableProcessing;
    }
    
    return validated;
}

/**
 * 加载配置
 */
async function loadConfig() {
    try {
        const result = await chrome.storage.sync.get(['config']);
        if (result.config) {
            // 验证并合并配置
            config = validateConfig(result.config);
            console.log('✅ 配置加载成功:', config);
        } else {
            // 使用默认配置
            config = getDefaultConfig();
            console.log('ℹ️ 使用默认配置');
            // 保存默认配置
            await chrome.storage.sync.set({ config });
        }
        
        // 更新UI
        elements.maxImages.value = config.maxImages;
        elements.removeWatermark.checked = config.removeWatermark;
    } catch (error) {
        console.error('加载配置失败:', error);
        // 使用默认配置
        config = getDefaultConfig();
        elements.maxImages.value = config.maxImages;
        elements.removeWatermark.checked = config.removeWatermark;
        addLog('加载配置失败，已使用默认配置: ' + error.message, 'warning');
    }
}

/**
 * 保存配置（静默保存，不显示提示）
 */
async function saveConfig() {
    try {
        // 从UI读取配置
        config.maxImages = parseInt(elements.maxImages.value) || 6;
        config.removeWatermark = elements.removeWatermark.checked;
        // enableProcessing保留在存储中，但不从UI读取（已移除UI元素）
        
        // 验证配置
        config = validateConfig(config);
        
        // 保存到storage
        await chrome.storage.sync.set({ config });
        console.log('✅ 配置已保存:', config);
    } catch (error) {
        console.error('保存配置失败:', error);
        // 重试一次
        try {
            await chrome.storage.sync.set({ config });
            console.log('✅ 配置保存重试成功');
        } catch (retryError) {
            console.error('配置保存重试失败:', retryError);
            addLog('保存配置失败: ' + error.message, 'error');
        }
    }
}

/**
 * 加载餐馆列表
 */
async function loadRestaurants() {
    try {
        const result = await chrome.storage.local.get(['restaurants']);
        if (result.restaurants && Array.isArray(result.restaurants)) {
            restaurants = result.restaurants;
        }
    } catch (error) {
        console.error('加载餐馆列表失败:', error);
        addLog('加载餐馆列表失败: ' + error.message, 'error');
    }
}

/**
 * 保存餐馆列表
 */
async function saveRestaurants() {
    try {
        await chrome.storage.local.set({ restaurants });
    } catch (error) {
        console.error('保存餐馆列表失败:', error);
        addLog('保存餐馆列表失败: ' + error.message, 'error');
    }
}

/**
 * 获取默认AI配置
 */
function getDefaultAIConfig() {
    return {
        enabled: false,
        apiKey: '',
        apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        model: 'glm-4-flash'
    };
}

/**
 * 获取默认选项配置
 */
function getDefaultOptions() {
    return {
        defaultDownloadPath: 'downloads',
        downloadDelay: 1000,
        aiRequestDelay: 2000, // 最小2000ms，但HTML默认是3000，会在加载时处理
        aiRequestRetries: 3,
        autoRemoveWatermark: true,
        autoProcessImage: true,
        showNotifications: false,
        autoOpenFolder: false
    };
}

/**
 * 验证AI配置
 */
function validateAIConfig(aiConfigData) {
    const defaultConfig = getDefaultAIConfig();
    const validated = { ...defaultConfig, ...aiConfigData };
    
    if (typeof validated.enabled !== 'boolean') {
        validated.enabled = defaultConfig.enabled;
    }
    if (typeof validated.apiKey !== 'string') {
        validated.apiKey = defaultConfig.apiKey;
    }
    if (typeof validated.apiUrl !== 'string' || !validated.apiUrl) {
        validated.apiUrl = defaultConfig.apiUrl;
    }
    if (typeof validated.model !== 'string' || !validated.model) {
        validated.model = defaultConfig.model;
    }
    
    return validated;
}

/**
 * 验证选项配置
 */
function validateOptions(optionsData) {
    const defaultOptions = getDefaultOptions();
    const validated = { ...defaultOptions, ...optionsData };
    
    if (typeof validated.defaultDownloadPath !== 'string' || !validated.defaultDownloadPath) {
        validated.defaultDownloadPath = defaultOptions.defaultDownloadPath;
    }
    if (typeof validated.downloadDelay !== 'number' || validated.downloadDelay < 0) {
        validated.downloadDelay = defaultOptions.downloadDelay;
    }
    if (typeof validated.aiRequestDelay !== 'number' || validated.aiRequestDelay < 1000) {
        validated.aiRequestDelay = defaultOptions.aiRequestDelay;
    }
    if (typeof validated.aiRequestRetries !== 'number' || validated.aiRequestRetries < 1 || validated.aiRequestRetries > 10) {
        validated.aiRequestRetries = defaultOptions.aiRequestRetries;
    }
    if (typeof validated.autoRemoveWatermark !== 'boolean') {
        validated.autoRemoveWatermark = defaultOptions.autoRemoveWatermark;
    }
    if (typeof validated.autoProcessImage !== 'boolean') {
        validated.autoProcessImage = defaultOptions.autoProcessImage;
    }
    if (typeof validated.showNotifications !== 'boolean') {
        validated.showNotifications = defaultOptions.showNotifications;
    }
    if (typeof validated.autoOpenFolder !== 'boolean') {
        validated.autoOpenFolder = defaultOptions.autoOpenFolder;
    }
    
    return validated;
}

/**
 * 加载高级配置
 */
async function loadAdvancedConfig() {
    try {
        // 加载AI配置（使用local存储以确保持久化，特别是API密钥）
        // 先尝试从local加载（持久化存储）
        let aiConfigResult = await chrome.storage.local.get(['aiConfig']);
        let aiConfig;
        
        // 如果local中没有，尝试从sync加载（兼容旧版本）
        if (!aiConfigResult.aiConfig) {
            const syncResult = await chrome.storage.sync.get(['aiConfig']);
            if (syncResult.aiConfig) {
                // 从sync迁移到local
                aiConfig = validateAIConfig(syncResult.aiConfig);
                await chrome.storage.local.set({ aiConfig });
                // 清除sync中的配置（避免重复）
                await chrome.storage.sync.remove(['aiConfig']);
                console.log('✅ AI配置已从sync迁移到local');
            }
        }
        
        if (aiConfigResult.aiConfig) {
            aiConfig = validateAIConfig(aiConfigResult.aiConfig);
            console.log('✅ AI配置加载成功（从local）');
        } else if (!aiConfig) {
            aiConfig = getDefaultAIConfig();
            console.log('ℹ️ 使用默认AI配置');
            // 保存默认AI配置到local
            await chrome.storage.local.set({ aiConfig });
        }
        
        // 更新AI配置UI
        elements.aiEnabled.checked = aiConfig.enabled;
        elements.aiApiKey.value = aiConfig.apiKey;
        elements.aiApiUrl.value = aiConfig.apiUrl;
        elements.aiModel.value = aiConfig.model;
        
        // 加载其他配置
        const optionsResult = await chrome.storage.sync.get(['options']);
        let options;
        if (optionsResult.options) {
            options = validateOptions(optionsResult.options);
            console.log('✅ 选项配置加载成功');
        } else {
            options = getDefaultOptions();
            console.log('ℹ️ 使用默认选项配置');
            // 保存默认选项配置
            await chrome.storage.sync.set({ options });
        }
        
        // 更新选项配置UI（确保值在有效范围内）
        elements.defaultDownloadPath.value = options.defaultDownloadPath || 'downloads';
        elements.downloadDelay.value = Math.max(0, options.downloadDelay || 1000);
        elements.aiRequestDelay.value = Math.max(2000, options.aiRequestDelay || 2000);
        elements.aiRequestRetries.value = Math.max(1, Math.min(10, options.aiRequestRetries || 3));
        elements.autoRemoveWatermark.checked = options.autoRemoveWatermark !== false;
        elements.autoProcessImage.checked = options.autoProcessImage !== false;
        elements.showNotifications.checked = options.showNotifications || false;
        elements.autoOpenFolder.checked = options.autoOpenFolder || false;
    } catch (error) {
        console.error('加载高级配置失败:', error);
        // 使用默认配置
        const defaultAIConfig = getDefaultAIConfig();
        const defaultOptions = getDefaultOptions();
        
        elements.aiEnabled.checked = defaultAIConfig.enabled;
        elements.aiApiKey.value = defaultAIConfig.apiKey;
        elements.aiApiUrl.value = defaultAIConfig.apiUrl;
        elements.aiModel.value = defaultAIConfig.model;
        
        elements.defaultDownloadPath.value = defaultOptions.defaultDownloadPath;
        elements.downloadDelay.value = defaultOptions.downloadDelay;
        elements.aiRequestDelay.value = defaultOptions.aiRequestDelay;
        elements.aiRequestRetries.value = defaultOptions.aiRequestRetries;
        elements.autoRemoveWatermark.checked = defaultOptions.autoRemoveWatermark;
        elements.autoProcessImage.checked = defaultOptions.autoProcessImage;
        elements.showNotifications.checked = defaultOptions.showNotifications;
        elements.autoOpenFolder.checked = defaultOptions.autoOpenFolder;
        
        addLog('加载高级配置失败，已使用默认配置: ' + error.message, 'warning');
    }
}

/**
 * 保存高级配置（静默保存）
 */
async function saveAdvancedConfig() {
    try {
        // 从UI读取AI配置
        const aiConfigData = {
            enabled: elements.aiEnabled.checked,
            apiKey: elements.aiApiKey.value || '',
            apiUrl: elements.aiApiUrl.value || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            model: elements.aiModel.value || 'glm-4-flash'
        };
        
        // 验证并保存AI配置（使用local存储以确保持久化）
        const aiConfig = validateAIConfig(aiConfigData);
        await chrome.storage.local.set({ aiConfig });
        console.log('✅ AI配置已保存到local存储');
        
        // 同时保存到sync（用于跨设备同步，但local是主要存储）
        try {
            await chrome.storage.sync.set({ aiConfig });
        } catch (syncError) {
            // sync存储可能失败（配额限制），不影响主要功能
            console.warn('AI配置同步到sync失败（不影响使用）:', syncError);
        }
        
        // 从UI读取选项配置
        const optionsData = {
            defaultDownloadPath: elements.defaultDownloadPath.value || 'downloads',
            downloadDelay: parseInt(elements.downloadDelay.value) || 1000,
            aiRequestDelay: parseInt(elements.aiRequestDelay.value) || 2000,
            aiRequestRetries: parseInt(elements.aiRequestRetries.value) || 3,
            autoRemoveWatermark: elements.autoRemoveWatermark.checked,
            autoProcessImage: elements.autoProcessImage.checked,
            showNotifications: elements.showNotifications.checked,
            autoOpenFolder: elements.autoOpenFolder.checked
        };
        
        // 验证并保存选项配置
        const options = validateOptions(optionsData);
        await chrome.storage.sync.set({ options });
        console.log('✅ 选项配置已保存');
    } catch (error) {
        console.error('保存高级配置失败:', error);
        // 重试一次
        try {
            const aiConfig = validateAIConfig({
                enabled: elements.aiEnabled.checked,
                apiKey: elements.aiApiKey.value || '',
                apiUrl: elements.aiApiUrl.value || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
                model: elements.aiModel.value || 'glm-4-flash'
            });
            const options = validateOptions({
                defaultDownloadPath: elements.defaultDownloadPath.value || 'downloads',
                downloadDelay: parseInt(elements.downloadDelay.value) || 1000,
                aiRequestDelay: parseInt(elements.aiRequestDelay.value) || 2000,
                aiRequestRetries: parseInt(elements.aiRequestRetries.value) || 3,
                autoRemoveWatermark: elements.autoRemoveWatermark.checked,
                autoProcessImage: elements.autoProcessImage.checked,
                showNotifications: elements.showNotifications.checked,
                autoOpenFolder: elements.autoOpenFolder.checked
            });
            // 保存到local（主要存储）
            await chrome.storage.local.set({ aiConfig });
            await chrome.storage.sync.set({ options });
            console.log('✅ 高级配置保存重试成功');
        } catch (retryError) {
            console.error('高级配置保存重试失败:', retryError);
        }
    }
}

/**
 * 绑定事件
 */
function bindEvents() {
    // 配置相关（自动保存）
    elements.maxImages.addEventListener('change', saveConfig);
    elements.removeWatermark.addEventListener('change', saveConfig);
    
    // 折叠/展开配置（标题行和按钮都可以点击）
    const configSection = document.getElementById('configSection');
    const configHeader = configSection.querySelector('.section-header');
    configHeader.addEventListener('click', (e) => {
        // 如果点击的是按钮本身，不阻止默认行为
        if (e.target.closest('.section-toggle')) {
            return;
        }
        toggleConfigSection();
    });
    elements.configToggle.addEventListener('click', (e) => {
        e.stopPropagation(); // 防止触发标题行的点击事件
        toggleConfigSection();
    });
    
    // 折叠/展开高级设置（标题行和按钮都可以点击）
    const advancedSection = document.getElementById('advancedSection');
    const advancedHeader = advancedSection.querySelector('.section-header');
    advancedHeader.addEventListener('click', (e) => {
        if (e.target.closest('.section-toggle')) {
            return;
        }
        toggleAdvancedSection();
    });
    elements.advancedToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleAdvancedSection();
    });
    
    // 高级配置相关（自动保存）
    elements.aiEnabled.addEventListener('change', saveAdvancedConfig);
    elements.aiApiKey.addEventListener('change', saveAdvancedConfig);
    elements.aiApiUrl.addEventListener('change', saveAdvancedConfig);
    elements.aiModel.addEventListener('change', saveAdvancedConfig);
    elements.aiRequestDelay.addEventListener('change', saveAdvancedConfig);
    elements.aiRequestRetries.addEventListener('change', saveAdvancedConfig);
    elements.defaultDownloadPath.addEventListener('change', saveAdvancedConfig);
    elements.downloadDelay.addEventListener('change', saveAdvancedConfig);
    elements.autoRemoveWatermark.addEventListener('change', saveAdvancedConfig);
    elements.autoProcessImage.addEventListener('change', saveAdvancedConfig);
    elements.showNotifications.addEventListener('change', saveAdvancedConfig);
    elements.autoOpenFolder.addEventListener('change', saveAdvancedConfig);
    
    // 餐馆管理
    elements.addRestaurantBtn.addEventListener('click', showAddRestaurantModal);
    elements.confirmAddBtn.addEventListener('click', handleAddRestaurant);
    elements.cancelAddBtn.addEventListener('click', hideAddRestaurantModal);
    elements.closeModalBtn.addEventListener('click', hideAddRestaurantModal);
    elements.importBtn.addEventListener('click', handleImport);
    
    // 下载控制
    elements.startDownloadBtn.addEventListener('click', handleStartDownload);
    
    // 日志控制
    elements.logLevel.addEventListener('change', filterLogs);
    elements.clearLogBtn.addEventListener('click', clearLogs);
    
    // 帮助按钮
    elements.helpBtn.addEventListener('click', () => {
        chrome.tabs.create({
            url: chrome.runtime.getURL('help/help.html')
        });
    });
}

/**
 * 设置消息监听
 */
function setupMessageListeners() {
    // 注意：popup页面需要使用chrome.runtime.onMessage来监听消息
    // 但popup页面关闭后监听器会失效，所以我们需要在每次打开时重新设置
    if (chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'downloadProgress') {
                updateProgress(message.data);
                // 同时保存到storage
                chrome.storage.local.set({ 
                    downloadProgress: message.data,
                    isDownloading: true
                }).catch(err => console.error('保存进度失败:', err));
            } else if (message.action === 'downloadLog') {
                addLog(message.data.message, message.data.level);
            } else if (message.action === 'downloadComplete') {
                handleDownloadComplete(message.data);
                // 清除storage中的进度数据
                chrome.storage.local.remove(['downloadProgress', 'isDownloading']).catch(() => {});
            }
            return true; // 保持消息通道开放
        });
    }
    
    // 定期检查进度更新（作为备用方案）
    if (isDownloading) {
        const progressCheckInterval = setInterval(async () => {
            if (!isDownloading) {
                clearInterval(progressCheckInterval);
                return;
            }
            try {
                const result = await chrome.storage.local.get(['downloadProgress']);
                if (result.downloadProgress) {
                    updateProgress(result.downloadProgress);
                }
            } catch (error) {
                console.error('检查进度失败:', error);
            }
        }, 1000); // 每秒检查一次
    }
}

/**
 * 更新UI
 */
function updateUI() {
    renderRestaurantList();
    updateStartButton();
}

// 事件委托处理器（只绑定一次）
let restaurantListHandler = null;

/**
 * 获取餐馆状态文本
 */
function getStatusText(restaurant, progressData) {
    // 如果有进度数据且是当前正在处理的餐馆，使用进度数据
    if (progressData && progressData.current) {
        const isCurrent = progressData.current.name === restaurant.name && 
                          progressData.current.location === restaurant.location;
        
        if (isCurrent) {
            // 当前正在处理的餐馆
            const status = progressData.current.status || 'processing';
            const total = progressData.current.totalImages || 0;
            const downloaded = progressData.current.downloadedCount || 0;
            const failed = progressData.current.failedCount || 0;
            
            if (status === 'processing') {
                return `下载中 (${downloaded}/${total})`;
            } else if (status === 'completed') {
                if (failed > 0) {
                    return `已完成 (${downloaded}/${total}, 失败${failed})`;
                }
                return `已完成 (${downloaded}/${total})`;
            } else if (status === 'failed') {
                return '失败';
            }
        }
    }
    
    // 从restaurant对象中获取状态（用于已完成或失败的餐馆）
    const status = restaurant.status || 'pending';
    if (status === 'completed') {
        const total = restaurant.totalImages || 0;
        const downloaded = restaurant.downloadedCount || 0;
        const failed = restaurant.failedCount || 0;
        if (failed > 0) {
            return `已完成 (${downloaded}/${total}, 失败${failed})`;
        }
        return total > 0 ? `已完成 (${downloaded}/${total})` : '已完成';
    } else if (status === 'failed') {
        return '失败';
    } else if (status === 'processing') {
        const total = restaurant.totalImages || 0;
        const downloaded = restaurant.downloadedCount || 0;
        return total > 0 ? `下载中 (${downloaded}/${total})` : '下载中';
    }
    
    // 默认状态：等待中（只在下载过程中显示）
    if (isDownloading) {
        return '等待中';
    }
    return '';
}

/**
 * 更新餐馆列表状态显示
 */
function updateRestaurantListStatus(progressData) {
    if (!progressData || !progressData.current) {
        return;
    }
    
    // 更新餐馆列表中的状态显示
    const restaurantItems = elements.restaurantList.querySelectorAll('.restaurant-item');
    restaurantItems.forEach((item, index) => {
        if (index < restaurants.length) {
            const restaurant = restaurants[index];
            const statusText = getStatusText(restaurant, progressData);
            const isCurrent = progressData.current.name === restaurant.name && 
                            progressData.current.location === restaurant.location;
            
            // 检查是否已有状态元素
            let statusEl = item.querySelector('.restaurant-status');
            if (!statusEl) {
                // 创建状态元素
                statusEl = document.createElement('span');
                statusEl.className = 'restaurant-status';
                // 插入到餐馆信息中
                const restaurantInfo = item.querySelector('.restaurant-info');
                if (restaurantInfo) {
                    restaurantInfo.appendChild(statusEl);
                }
            }
            
            // 更新状态文本和样式
            if (statusText) {
                statusEl.textContent = statusText;
                statusEl.className = 'restaurant-status';
                
                // 根据状态添加样式类
                if (isCurrent && progressData.current.status === 'processing') {
                    statusEl.classList.add('status-processing');
                } else if (restaurant.status === 'completed') {
                    statusEl.classList.add('status-completed');
                } else if (restaurant.status === 'failed') {
                    statusEl.classList.add('status-failed');
                } else {
                    statusEl.classList.add('status-pending');
                }
            } else {
                statusEl.style.display = 'none';
            }
        }
    });
}

/**
 * 渲染餐馆列表
 */
function renderRestaurantList() {
    if (restaurants.length === 0) {
        elements.restaurantList.innerHTML = '<p class="empty-message">暂无餐馆配置，请添加或导入</p>';
        return;
    }
    
    const html = restaurants.map((restaurant, index) => {
        const statusText = getStatusText(restaurant, currentProgress);
        const statusClass = restaurant.status === 'processing' ? 'status-processing' :
                           restaurant.status === 'completed' ? 'status-completed' :
                           restaurant.status === 'failed' ? 'status-failed' : 'status-pending';
        
        return `
        <div class="restaurant-item" data-index="${index}">
            <div class="restaurant-info">
                <span class="restaurant-name">${escapeHtml(restaurant.name)}</span>
                <span class="restaurant-location">${restaurant.location || '未设置地点'}</span>
                ${statusText ? `<span class="restaurant-status ${statusClass}">${statusText}</span>` : ''}
            </div>
            <div class="restaurant-actions">
                <button class="btn-icon btn-edit" data-action="edit" data-index="${index}" title="编辑">
                    <i class="icon-edit"></i>
                </button>
                <button class="btn-icon btn-delete" data-action="delete" data-index="${index}" title="删除">
                    <i class="icon-delete"></i>
                </button>
            </div>
        </div>
    `;
    }).join('');
    
    elements.restaurantList.innerHTML = html;
    
    // 只绑定一次事件监听器（使用事件委托，避免CSP问题）
    if (!restaurantListHandler) {
        restaurantListHandler = (e) => {
            const button = e.target.closest('.btn-icon');
            if (!button) return;
            
            const action = button.getAttribute('data-action');
            const indexStr = button.getAttribute('data-index');
            
            if (!indexStr) {
                console.error('缺少data-index属性');
                return;
            }
            
            const index = parseInt(indexStr);
            
            if (isNaN(index) || index < 0 || index >= restaurants.length) {
                console.error('无效的索引:', index, '总数:', restaurants.length);
                return;
            }
            
            if (action === 'edit') {
                editRestaurant(index);
            } else if (action === 'delete') {
                deleteRestaurant(index);
            }
        };
        
        elements.restaurantList.addEventListener('click', restaurantListHandler);
    }
}

/**
 * 更新开始下载按钮状态
 */
function updateStartButton() {
    const hasRestaurants = restaurants.length > 0;
    // 移除登录状态检查，只要有餐馆就可以下载
    elements.startDownloadBtn.disabled = !hasRestaurants || isDownloading;
}

/**
 * 显示添加餐馆对话框
 */
function showAddRestaurantModal() {
    elements.restaurantName.value = '';
    elements.restaurantLocation.value = '';
    elements.addRestaurantModal.style.display = 'flex';
}

/**
 * 隐藏添加餐馆对话框
 */
function hideAddRestaurantModal() {
    elements.addRestaurantModal.style.display = 'none';
}

/**
 * 处理添加餐馆
 */
function handleAddRestaurant() {
    const name = elements.restaurantName.value.trim();
    const location = elements.restaurantLocation.value.trim();
    
    if (!name) {
        alert('请输入餐馆名称');
        return;
    }
    
    restaurants.push({
        name,
        location: location || null
    });
    
    saveRestaurants();
    updateUI();
    hideAddRestaurantModal();
    addLog(`已添加餐馆: ${name}`, 'success');
}

/**
 * 编辑餐馆
 */
function editRestaurant(index) {
    const restaurant = restaurants[index];
    elements.restaurantName.value = restaurant.name;
    elements.restaurantLocation.value = restaurant.location || '';
    elements.addRestaurantModal.style.display = 'flex';
    
    // 修改确认按钮行为
    const originalHandler = elements.confirmAddBtn.onclick;
    elements.confirmAddBtn.onclick = () => {
        const name = elements.restaurantName.value.trim();
        const location = elements.restaurantLocation.value.trim();
        
        if (!name) {
            alert('请输入餐馆名称');
            return;
        }
        
        restaurants[index] = { name, location: location || null };
        saveRestaurants();
        updateUI();
        hideAddRestaurantModal();
        elements.confirmAddBtn.onclick = originalHandler;
        addLog(`已更新餐馆: ${name}`, 'success');
    };
}

/**
 * 删除餐馆（直接删除，无需确认）
 */
async function deleteRestaurant(index) {
    // 验证索引
    if (index < 0 || index >= restaurants.length) {
        console.error('删除失败: 无效的索引', index);
        addLog('删除失败: 无效的索引', 'error');
        return;
    }
    
    const restaurant = restaurants[index];
    if (!restaurant) {
        console.error('删除失败: 餐馆不存在', index);
        addLog('删除失败: 餐馆不存在', 'error');
        return;
    }
    
    try {
        const name = restaurant.name;
        restaurants.splice(index, 1);
        
        // 保存到存储
        await saveRestaurants();
        
        // 更新UI
        updateUI();
        
        // 记录日志
        addLog(`已删除餐馆: ${name}`, 'success');
        console.log('✅ 已删除餐馆:', name);
    } catch (error) {
        console.error('删除餐馆失败:', error);
        addLog(`删除餐馆失败: ${error.message}`, 'error');
        // 恢复数组（如果保存失败）
        restaurants.splice(index, 0, restaurant);
    }
}

/**
 * 处理导入
 */
function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            if (file.name.endsWith('.csv')) {
                parseCSV(text);
            } else if (file.name.endsWith('.json')) {
                parseJSON(text);
            }
            saveRestaurants();
            updateUI();
            addLog(`已导入 ${restaurants.length} 个餐馆`, 'success');
        } catch (error) {
            console.error('导入失败:', error);
            addLog('导入失败: ' + error.message, 'error');
        }
    };
    input.click();
}

/**
 * 解析CSV
 */
function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    restaurants = [];
    
    for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts[0]) {
            restaurants.push({
                name: parts[0],
                location: parts[1] || null
            });
        }
    }
}

/**
 * 解析JSON
 */
function parseJSON(text) {
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
        restaurants = data.map(item => ({
            name: item.name,
            location: item.location || null
        }));
    }
}


/**
 * 处理开始下载
 */
async function handleStartDownload() {
    if (isDownloading) {
        return;
    }
    
    if (restaurants.length === 0) {
        alert('请先添加餐馆配置');
        return;
    }
    
    isDownloading = true;
    elements.startDownloadBtn.disabled = true;
    elements.progressSection.style.display = 'block';
    elements.logSection.style.display = 'block';
    
    // 保存当前配置
    await saveConfig();
    
    // 读取AI配置（从local读取，持久化存储）
    let aiConfigResult = await chrome.storage.local.get(['aiConfig']);
    let aiConfig = aiConfigResult.aiConfig;
    
    // 如果local中没有，尝试从sync读取（兼容旧版本）
    if (!aiConfig) {
        const syncResult = await chrome.storage.sync.get(['aiConfig']);
        if (syncResult.aiConfig) {
            // 从sync迁移到local
            aiConfig = syncResult.aiConfig;
            await chrome.storage.local.set({ aiConfig });
            await chrome.storage.sync.remove(['aiConfig']);
        }
    }
    
    if (!aiConfig) {
        aiConfig = {};
    }
    
    // 构建完整的配置对象
    const fullConfig = {
        ...config,
        enableAI: aiConfig.enabled && !!aiConfig.apiKey, // 只有启用且有API密钥时才启用AI
        aiConfig: aiConfig // 传递完整的AI配置
    };
    
    console.log('📤 发送下载请求，配置:', {
        maxImages: fullConfig.maxImages,
        removeWatermark: fullConfig.removeWatermark,
        enableProcessing: fullConfig.enableProcessing,
        enableAI: fullConfig.enableAI,
        hasApiKey: !!aiConfig.apiKey
    });
    
    // 发送下载请求到background script
    chrome.runtime.sendMessage({
        action: 'startDownload',
        data: {
            restaurants,
            config: fullConfig
        }
    });
    
    addLog('开始批量下载...', 'info');
    if (fullConfig.enableAI) {
        addLog('AI分析功能已启用', 'info');
    } else {
        addLog('AI分析功能未启用（请在高级设置中配置API密钥）', 'warning');
    }
}

/**
 * 处理下载完成
 */
function handleDownloadComplete(data) {
    isDownloading = false;
    elements.startDownloadBtn.disabled = false;
    updateStartButton();
    
    // 如果有餐馆状态数据，同步更新本地餐馆列表
    if (data.restaurants && Array.isArray(data.restaurants)) {
        data.restaurants.forEach(completedRestaurant => {
            // 找到对应的餐馆并更新状态
            const index = restaurants.findIndex(r => 
                r.name === completedRestaurant.name && 
                r.location === completedRestaurant.location
            );
            
            if (index !== -1) {
                // 更新餐馆状态
                restaurants[index].status = completedRestaurant.status;
                restaurants[index].downloadedCount = completedRestaurant.downloadedCount || 0;
                restaurants[index].failedCount = completedRestaurant.failedCount || 0;
                restaurants[index].totalImages = completedRestaurant.totalImages || 0;
            }
        });
        
        // 保存更新后的餐馆列表
        saveRestaurants();
    }
    
    // 清除当前进度数据
    currentProgress = null;
    
    // 清除storage中的进度数据
    chrome.storage.local.remove(['downloadProgress', 'isDownloading']).catch(() => {});
    
    // 更新餐馆列表显示（显示最终状态）
    renderRestaurantList();
    
    addLog(`下载完成！共处理 ${data.total} 个餐馆，成功 ${data.success} 个，失败 ${data.failed} 个`, 'success');
}

/**
 * 更新进度
 */
function updateProgress(data) {
    // 保存进度数据
    currentProgress = data;
    
    const percent = Math.round((data.completed / data.total) * 100);
    elements.progressFill.style.width = percent + '%';
    elements.progressText.textContent = percent + '%';
    
    if (data.current) {
        // 显示当前餐馆信息和图片进度
        const imageProgress = data.current.totalImages > 0 
            ? ` - 已下载 ${data.current.downloadedCount || 0}/${data.current.totalImages} 张图片`
            : '';
        const currentImage = data.current.currentImageIndex 
            ? ` (正在下载第 ${data.current.currentImageIndex} 张)`
            : '';
        
        elements.currentTask.textContent = `正在处理: ${data.current.name} (${data.current.location || '未设置地点'})${imageProgress}${currentImage}`;
        
        // 更新图片进度显示
        const currentImageProgressEl = document.getElementById('currentImageProgress');
        if (currentImageProgressEl) {
            if (data.current.currentImageIndex) {
                currentImageProgressEl.textContent = `正在下载第 ${data.current.currentImageIndex}/${data.current.totalImages} 张图片`;
                currentImageProgressEl.style.display = 'block';
            } else if (data.current.totalImages > 0) {
                currentImageProgressEl.textContent = `已下载 ${data.current.downloadedCount || 0}/${data.current.totalImages} 张图片`;
                currentImageProgressEl.style.display = 'block';
            } else {
                currentImageProgressEl.style.display = 'none';
            }
        }
        
        // 更新图片进度条
        const imageProgressBar = document.getElementById('imageProgressBar');
        const imageProgressFill = document.getElementById('imageProgressFill');
        if (imageProgressBar && imageProgressFill && data.current.totalImages > 0) {
            const imagePercent = Math.round(((data.current.downloadedCount || 0) / data.current.totalImages) * 100);
            imageProgressFill.style.width = imagePercent + '%';
            imageProgressBar.style.display = 'block';
        }
    } else {
        // 隐藏图片进度显示
        const currentImageProgressEl = document.getElementById('currentImageProgress');
        if (currentImageProgressEl) {
            currentImageProgressEl.style.display = 'none';
        }
        const imageProgressBar = document.getElementById('imageProgressBar');
        if (imageProgressBar) {
            imageProgressBar.style.display = 'none';
        }
    }
    
    elements.progressDetails.innerHTML = `
        <div>已完成: ${data.completed} / ${data.total}</div>
        <div>成功: ${data.success}</div>
        <div>失败: ${data.failed}</div>
        ${data.current && data.current.currentImageIndex ? `<div>当前图片: ${data.current.currentImageIndex}/${data.current.totalImages}</div>` : ''}
    `;
    
    // 更新餐馆列表状态
    updateRestaurantListStatus(data);
}

/**
 * 添加日志
 */
function addLog(message, level = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${level}`;
    logEntry.innerHTML = `
        <span class="log-time">${new Date().toLocaleTimeString()}</span>
        <span class="log-message">${escapeHtml(message)}</span>
    `;
    
    elements.logContainer.appendChild(logEntry);
    elements.logContainer.scrollTop = elements.logContainer.scrollHeight;
}

/**
 * 过滤日志
 */
function filterLogs() {
    const level = elements.logLevel.value;
    const entries = elements.logContainer.querySelectorAll('.log-entry');
    
    entries.forEach(entry => {
        if (level === 'all' || entry.classList.contains(`log-${level}`)) {
            entry.style.display = 'block';
        } else {
            entry.style.display = 'none';
        }
    });
}

/**
 * 清空日志
 */
function clearLogs() {
    elements.logContainer.innerHTML = '';
}

/**
 * 切换配置板块的折叠/展开状态
 */
function toggleConfigSection() {
    const content = elements.configContent;
    const toggle = elements.configToggle;
    const isCollapsed = content.style.display === 'none';
    
    if (isCollapsed) {
        content.style.display = 'block';
        toggle.classList.add('expanded');
        toggle.setAttribute('aria-label', '收起设置');
    } else {
        content.style.display = 'none';
        toggle.classList.remove('expanded');
        toggle.setAttribute('aria-label', '展开设置');
    }
}

/**
 * 切换高级设置板块的折叠/展开状态
 */
function toggleAdvancedSection() {
    const content = elements.advancedContent;
    const toggle = elements.advancedToggle;
    const isCollapsed = content.style.display === 'none';
    
    if (isCollapsed) {
        content.style.display = 'block';
        toggle.classList.add('expanded');
        toggle.setAttribute('aria-label', '收起高级设置');
    } else {
        content.style.display = 'none';
        toggle.classList.remove('expanded');
        toggle.setAttribute('aria-label', '展开高级设置');
    }
}

/**
 * HTML转义
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 注意：不再需要将函数暴露到window，因为使用了事件委托
// 保留这些函数以便调试
if (typeof window !== 'undefined') {
    window.editRestaurant = editRestaurant;
    window.deleteRestaurant = deleteRestaurant;
}

// 初始化
init();

