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
    configToggle: document.getElementById('configToggle'),
    configContent: document.getElementById('configContent'),
    advancedToggle: document.getElementById('advancedToggle'),
    advancedContent: document.getElementById('advancedContent'),
    // 高级设置元素
    aiEnabled: document.getElementById('aiEnabled'),
    aiApiKey: document.getElementById('aiApiKey'),
    aiApiUrl: document.getElementById('aiApiUrl'),
    aiModel: document.getElementById('aiModel'),
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
    
    // 加载配置
    await loadConfig();
    
    // 加载高级配置
    await loadAdvancedConfig();
    
    // 加载餐馆列表
    await loadRestaurants();
    
    // 绑定事件
    bindEvents();
    
    // 监听消息
    setupMessageListeners();
    
    // 更新UI
    updateUI();
    
    console.log('Popup界面初始化完成');
}

/**
 * 加载配置
 */
async function loadConfig() {
    try {
        const result = await chrome.storage.sync.get(['config']);
        if (result.config) {
            config = { ...config, ...result.config };
            // 更新UI（enableProcessing保留在存储中，但不显示在UI）
            elements.maxImages.value = config.maxImages;
            elements.removeWatermark.checked = config.removeWatermark;
        }
    } catch (error) {
        console.error('加载配置失败:', error);
        addLog('加载配置失败: ' + error.message, 'error');
    }
}

/**
 * 保存配置（静默保存，不显示提示）
 */
async function saveConfig() {
    try {
        config.maxImages = parseInt(elements.maxImages.value) || 6;
        config.removeWatermark = elements.removeWatermark.checked;
        // enableProcessing保留在存储中，但不从UI读取（已移除UI元素）
        
        await chrome.storage.sync.set({ config });
        // 静默保存，不显示提示
    } catch (error) {
        console.error('保存配置失败:', error);
        // 只在错误时显示提示
        addLog('保存配置失败: ' + error.message, 'error');
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
 * 加载高级配置
 */
async function loadAdvancedConfig() {
    try {
        // 加载AI配置
        const aiConfigResult = await chrome.storage.sync.get(['aiConfig']);
        if (aiConfigResult.aiConfig) {
            const aiConfig = aiConfigResult.aiConfig;
            elements.aiEnabled.checked = aiConfig.enabled || false;
            elements.aiApiKey.value = aiConfig.apiKey || '';
            elements.aiApiUrl.value = aiConfig.apiUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
            elements.aiModel.value = aiConfig.model || 'glm-4-flash';
        }
        
        // 加载其他配置
        const optionsResult = await chrome.storage.sync.get(['options']);
        if (optionsResult.options) {
            const options = optionsResult.options;
            elements.defaultDownloadPath.value = options.defaultDownloadPath || 'downloads';
            elements.downloadDelay.value = options.downloadDelay || 1000;
            elements.autoRemoveWatermark.checked = options.autoRemoveWatermark !== false;
            elements.autoProcessImage.checked = options.autoProcessImage !== false;
            elements.showNotifications.checked = options.showNotifications || false;
            elements.autoOpenFolder.checked = options.autoOpenFolder || false;
        }
    } catch (error) {
        console.error('加载高级配置失败:', error);
    }
}

/**
 * 保存高级配置（静默保存）
 */
async function saveAdvancedConfig() {
    try {
        // 保存AI配置
        const aiConfig = {
            enabled: elements.aiEnabled.checked,
            apiKey: elements.aiApiKey.value,
            apiUrl: elements.aiApiUrl.value,
            model: elements.aiModel.value
        };
        await chrome.storage.sync.set({ aiConfig });
        
        // 保存其他配置
        const options = {
            defaultDownloadPath: elements.defaultDownloadPath.value,
            downloadDelay: parseInt(elements.downloadDelay.value) || 1000,
            autoRemoveWatermark: elements.autoRemoveWatermark.checked,
            autoProcessImage: elements.autoProcessImage.checked,
            showNotifications: elements.showNotifications.checked,
            autoOpenFolder: elements.autoOpenFolder.checked
        };
        await chrome.storage.sync.set({ options });
    } catch (error) {
        console.error('保存高级配置失败:', error);
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
            } else if (message.action === 'downloadLog') {
                addLog(message.data.message, message.data.level);
            } else if (message.action === 'downloadComplete') {
                handleDownloadComplete(message.data);
            }
            return true; // 保持消息通道开放
        });
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
 * 渲染餐馆列表
 */
function renderRestaurantList() {
    if (restaurants.length === 0) {
        elements.restaurantList.innerHTML = '<p class="empty-message">暂无餐馆配置，请添加或导入</p>';
        return;
    }
    
    const html = restaurants.map((restaurant, index) => `
        <div class="restaurant-item" data-index="${index}">
            <div class="restaurant-info">
                <span class="restaurant-name">${escapeHtml(restaurant.name)}</span>
                <span class="restaurant-location">${restaurant.location || '未设置地点'}</span>
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
    `).join('');
    
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
    
    // 读取AI配置
    const aiConfigResult = await chrome.storage.sync.get(['aiConfig']);
    const aiConfig = aiConfigResult.aiConfig || {};
    
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
    
    addLog(`下载完成！共处理 ${data.total} 个餐馆，成功 ${data.success} 个，失败 ${data.failed} 个`, 'success');
}

/**
 * 更新进度
 */
function updateProgress(data) {
    const percent = Math.round((data.completed / data.total) * 100);
    elements.progressFill.style.width = percent + '%';
    elements.progressText.textContent = percent + '%';
    
    if (data.current) {
        elements.currentTask.textContent = `正在处理: ${data.current.name} (${data.current.location || '未设置地点'})`;
    }
    
    elements.progressDetails.innerHTML = `
        <div>已完成: ${data.completed} / ${data.total}</div>
        <div>成功: ${data.success}</div>
        <div>失败: ${data.failed}</div>
    `;
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

