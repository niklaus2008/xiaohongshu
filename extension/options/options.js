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
    saveOptionsBtn: document.getElementById('saveOptionsBtn'),
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
        // 加载AI配置
        const aiConfig = await chrome.storage.sync.get(['aiConfig']);
        if (aiConfig.aiConfig) {
            elements.aiEnabled.checked = aiConfig.aiConfig.enabled || false;
            elements.aiApiKey.value = aiConfig.aiConfig.apiKey || '';
            elements.aiApiUrl.value = aiConfig.aiConfig.apiUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
            elements.aiModel.value = aiConfig.aiConfig.model || 'glm-4-flash';
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
 * 保存配置
 */
async function saveOptions() {
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
        
        alert('设置已保存');
    } catch (error) {
        console.error('保存配置失败:', error);
        alert('保存配置失败: ' + error.message);
    }
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
        
        await saveOptions();
        alert('已重置为默认值');
    }
}

/**
 * 导出数据
 */
async function exportData() {
    try {
        const data = {
            config: await chrome.storage.sync.get(['config']),
            aiConfig: await chrome.storage.sync.get(['aiConfig']),
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
                await chrome.storage.sync.set({ aiConfig: data.aiConfig.aiConfig });
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
    elements.saveOptionsBtn.addEventListener('click', saveOptions);
    elements.resetOptionsBtn.addEventListener('click', resetOptions);
    elements.exportDataBtn.addEventListener('click', exportData);
    elements.importDataBtn.addEventListener('click', importData);
    elements.clearDataBtn.addEventListener('click', clearData);
}

// 初始化
init();

