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
    loginStatus: document.getElementById('loginStatus'),
    loginBtn: document.getElementById('loginBtn'),
    checkLoginBtn: document.getElementById('checkLoginBtn'),
    maxImages: document.getElementById('maxImages'),
    removeWatermark: document.getElementById('removeWatermark'),
    enableProcessing: document.getElementById('enableProcessing'),
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
    saveConfigBtn: document.getElementById('saveConfigBtn'),
    loadConfigBtn: document.getElementById('loadConfigBtn'),
    openOptionsBtn: document.getElementById('openOptionsBtn'),
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
    
    // 加载餐馆列表
    await loadRestaurants();
    
    // 检查登录状态
    await checkLoginStatus();
    
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
            // 更新UI
            elements.maxImages.value = config.maxImages;
            elements.removeWatermark.checked = config.removeWatermark;
            elements.enableProcessing.checked = config.enableProcessing;
        }
    } catch (error) {
        console.error('加载配置失败:', error);
        addLog('加载配置失败: ' + error.message, 'error');
    }
}

/**
 * 保存配置
 */
async function saveConfig() {
    try {
        config.maxImages = parseInt(elements.maxImages.value) || 6;
        config.removeWatermark = elements.removeWatermark.checked;
        config.enableProcessing = elements.enableProcessing.checked;
        
        await chrome.storage.sync.set({ config });
        addLog('配置已保存', 'success');
    } catch (error) {
        console.error('保存配置失败:', error);
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
 * 检查登录状态
 */
async function checkLoginStatus() {
    try {
        elements.loginStatus.innerHTML = `
            <div class="spinner"></div>
            <p>正在检查登录状态...</p>
        `;
        
        // 发送消息到background script检查登录状态
        const response = await chrome.runtime.sendMessage({
            action: 'checkLoginStatus'
        });
        
        if (response && response.loggedIn) {
            elements.loginStatus.innerHTML = `
                <div class="status-success">
                    <i class="icon-check"></i>
                    <p>已登录</p>
                </div>
            `;
            elements.loginBtn.style.display = 'none';
            elements.checkLoginBtn.style.display = 'block';
            updateStartButton();
        } else {
            elements.loginStatus.innerHTML = `
                <div class="status-error">
                    <i class="icon-warning"></i>
                    <p>未登录</p>
                </div>
            `;
            elements.loginBtn.style.display = 'block';
            elements.checkLoginBtn.style.display = 'block';
            elements.startDownloadBtn.disabled = true;
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);
        elements.loginStatus.innerHTML = `
            <div class="status-error">
                <i class="icon-warning"></i>
                <p>检查失败</p>
            </div>
        `;
    }
}

/**
 * 绑定事件
 */
function bindEvents() {
    // 登录相关
    elements.loginBtn.addEventListener('click', handleLogin);
    elements.checkLoginBtn.addEventListener('click', checkLoginStatus);
    
    // 配置相关
    elements.maxImages.addEventListener('change', saveConfig);
    elements.removeWatermark.addEventListener('change', saveConfig);
    elements.enableProcessing.addEventListener('change', saveConfig);
    
    // 餐馆管理
    elements.addRestaurantBtn.addEventListener('click', showAddRestaurantModal);
    elements.confirmAddBtn.addEventListener('click', handleAddRestaurant);
    elements.cancelAddBtn.addEventListener('click', hideAddRestaurantModal);
    elements.closeModalBtn.addEventListener('click', hideAddRestaurantModal);
    elements.importBtn.addEventListener('click', handleImport);
    
    // 下载控制
    elements.startDownloadBtn.addEventListener('click', handleStartDownload);
    
    // 配置管理
    elements.saveConfigBtn.addEventListener('click', handleSaveConfig);
    elements.loadConfigBtn.addEventListener('click', handleLoadConfig);
    elements.openOptionsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
    
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
    const isLoggedIn = elements.loginStatus.querySelector('.status-success') !== null;
    elements.startDownloadBtn.disabled = !hasRestaurants || !isLoggedIn || isDownloading;
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
 * 处理登录
 */
async function handleLogin() {
    try {
        // 打开小红书登录页面
        const tab = await chrome.tabs.create({
            url: 'https://www.xiaohongshu.com/login'
        });
        
        addLog('已打开登录页面，请完成登录后点击"重新检查登录状态"', 'info');
    } catch (error) {
        console.error('打开登录页面失败:', error);
        addLog('打开登录页面失败: ' + error.message, 'error');
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
 * 处理保存配置
 */
async function handleSaveConfig() {
    await saveConfig();
    const data = {
        restaurants,
        config
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'xiaohongshu-config.json';
    a.click();
    URL.revokeObjectURL(url);
    
    addLog('配置已导出', 'success');
}

/**
 * 处理加载配置
 */
async function handleLoadConfig() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.restaurants) {
                restaurants = data.restaurants;
                await saveRestaurants();
            }
            
            if (data.config) {
                config = { ...config, ...data.config };
                await chrome.storage.sync.set({ config });
                elements.maxImages.value = config.maxImages;
                elements.removeWatermark.checked = config.removeWatermark;
                elements.enableProcessing.checked = config.enableProcessing;
            }
            
            updateUI();
            addLog('配置已导入', 'success');
        } catch (error) {
            console.error('加载配置失败:', error);
            addLog('加载配置失败: ' + error.message, 'error');
        }
    };
    input.click();
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

