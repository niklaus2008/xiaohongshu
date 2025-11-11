/**
 * 选项页面脚本
 * 处理配置管理和数据导入导出
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

// DOM元素
const elements = {
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
    saveAndCloseBtn: document.getElementById('saveAndCloseBtn'),
    saveOnlyBtn: document.getElementById('saveOnlyBtn'),
    resetOptionsBtn: document.getElementById('resetOptionsBtn'),
    exportDataBtn: document.getElementById('exportDataBtn'),
    importDataBtn: document.getElementById('importDataBtn'),
    clearDataBtn: document.getElementById('clearDataBtn')
};

/**
 * 初始化
 */
async function init() {
    console.log('初始化选项页面...');
    
    // 加载配置
    await loadOptions();
    
    // 绑定事件
    bindEvents();
    
    console.log('选项页面初始化完成');
}

/**
 * 加载配置
 */
async function loadOptions() {
    try {
        // 加载AI配置（从local读取，持久化存储）
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
        
        if (aiConfig) {
            elements.aiEnabled.checked = aiConfig.enabled || false;
            elements.aiApiKey.value = aiConfig.apiKey || '';
            elements.aiApiUrl.value = aiConfig.apiUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
            elements.aiModel.value = aiConfig.model || 'glm-4-flash';
        }
        
        // 加载其他配置
        const options = await chrome.storage.sync.get(['options']);
        if (options.options) {
            elements.defaultDownloadPath.value = options.options.defaultDownloadPath || 'downloads';
            elements.downloadDelay.value = options.options.downloadDelay || 1000;
            elements.autoRemoveWatermark.checked = options.options.autoRemoveWatermark !== false;
            elements.autoProcessImage.checked = options.options.autoProcessImage !== false;
            elements.showNotifications.checked = options.options.showNotifications || false;
            elements.autoOpenFolder.checked = options.options.autoOpenFolder || false;
        }
    } catch (error) {
        console.error('加载配置失败:', error);
        alert('加载配置失败: ' + error.message);
    }
}

/**
 * 保存配置（内部函数）
 * @param {boolean} showMessage - 是否显示成功消息
 * @returns {Promise<boolean>} 保存是否成功
 */
async function saveOptions(showMessage = true) {
    try {
        // 保存AI配置（保存到local以确保持久化）
        const aiConfig = {
            enabled: elements.aiEnabled.checked,
            apiKey: elements.aiApiKey.value,
            apiUrl: elements.aiApiUrl.value,
            model: elements.aiModel.value
        };
        await chrome.storage.local.set({ aiConfig });
        // 同时尝试保存到sync（用于跨设备同步，但local是主要存储）
        try {
            await chrome.storage.sync.set({ aiConfig });
        } catch (syncError) {
            console.warn('AI配置同步到sync失败（不影响使用）:', syncError);
        }
        
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
        
        if (showMessage) {
            showSuccessMessage('设置已保存');
        }
        return true;
    } catch (error) {
        console.error('保存配置失败:', error);
        showErrorMessage('保存配置失败: ' + error.message);
        return false;
    }
}

/**
 * 保存并关闭窗口
 */
async function saveAndClose() {
    const success = await saveOptions(false); // 不显示消息，因为要关闭窗口
    if (success) {
        // 延迟一下，确保保存完成
        setTimeout(() => {
            window.close();
        }, 100);
    }
}

/**
 * 仅保存（不关闭窗口）
 */
async function saveOnly() {
    await saveOptions(true); // 显示成功消息
}

/**
 * 显示成功消息
 * @param {string} message - 消息内容
 */
function showSuccessMessage(message) {
    // 创建消息提示元素
    const messageEl = document.createElement('div');
    messageEl.className = 'message message-success';
    messageEl.textContent = message;
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4caf50;
        color: white;
        padding: 12px 24px;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(messageEl);
    
    // 3秒后自动移除
    setTimeout(() => {
        messageEl.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(messageEl);
        }, 300);
    }, 3000);
}

/**
 * 显示错误消息
 * @param {string} message - 消息内容
 */
function showErrorMessage(message) {
    // 创建消息提示元素
    const messageEl = document.createElement('div');
    messageEl.className = 'message message-error';
    messageEl.textContent = message;
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 12px 24px;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(messageEl);
    
    // 5秒后自动移除
    setTimeout(() => {
        messageEl.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (document.body.contains(messageEl)) {
                document.body.removeChild(messageEl);
            }
        }, 300);
    }, 5000);
}

/**
 * 重置配置
 */
async function resetOptions() {
    if (confirm('确定要重置所有设置为默认值吗？')) {
        // 重置AI配置
        elements.aiEnabled.checked = false;
        elements.aiApiKey.value = '';
        elements.aiApiUrl.value = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
        elements.aiModel.value = 'glm-4-flash';
        
        // 重置其他配置
        elements.defaultDownloadPath.value = 'downloads';
        elements.downloadDelay.value = 1000;
        elements.autoRemoveWatermark.checked = true;
        elements.autoProcessImage.checked = true;
        elements.showNotifications.checked = false;
        elements.autoOpenFolder.checked = false;
        
        await saveOptions(false);
        showSuccessMessage('已重置为默认值');
    }
}

/**
 * 导出数据
 */
async function exportData() {
    try {
        // 导出数据时，AI配置从local读取（主要存储）
        const data = {
            config: await chrome.storage.sync.get(['config']),
            aiConfig: await chrome.storage.local.get(['aiConfig']), // 从local读取
            options: await chrome.storage.sync.get(['options']),
            restaurants: await chrome.storage.local.get(['restaurants']),
            downloadHistory: await chrome.storage.local.get(['downloadHistory'])
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `xiaohongshu-extension-data-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        alert('数据已导出');
    } catch (error) {
        console.error('导出数据失败:', error);
        alert('导出数据失败: ' + error.message);
    }
}

/**
 * 导入数据
 */
async function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.config) {
                await chrome.storage.sync.set({ config: data.config.config });
            }
            if (data.aiConfig) {
                // 保存到local以确保持久化
                await chrome.storage.local.set({ aiConfig: data.aiConfig.aiConfig });
                // 同时尝试保存到sync
                try {
                    await chrome.storage.sync.set({ aiConfig: data.aiConfig.aiConfig });
                } catch (syncError) {
                    console.warn('AI配置同步到sync失败（不影响使用）:', syncError);
                }
            }
            if (data.options) {
                await chrome.storage.sync.set({ options: data.options.options });
            }
            if (data.restaurants) {
                await chrome.storage.local.set({ restaurants: data.restaurants.restaurants });
            }
            if (data.downloadHistory) {
                await chrome.storage.local.set({ downloadHistory: data.downloadHistory.downloadHistory });
            }
            
            await loadOptions();
            alert('数据已导入');
        } catch (error) {
            console.error('导入数据失败:', error);
            alert('导入数据失败: ' + error.message);
        }
    };
    input.click();
}

/**
 * 清除所有数据
 */
async function clearData() {
    if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
        try {
            await chrome.storage.sync.clear();
            await chrome.storage.local.clear();
            await loadOptions();
            alert('所有数据已清除');
        } catch (error) {
            console.error('清除数据失败:', error);
            alert('清除数据失败: ' + error.message);
        }
    }
}

/**
 * 绑定事件
 */
function bindEvents() {
    elements.saveAndCloseBtn.addEventListener('click', saveAndClose);
    elements.saveOnlyBtn.addEventListener('click', saveOnly);
    elements.resetOptionsBtn.addEventListener('click', resetOptions);
    elements.exportDataBtn.addEventListener('click', exportData);
    elements.importDataBtn.addEventListener('click', importData);
    elements.clearDataBtn.addEventListener('click', clearData);
}

// 初始化
init();

