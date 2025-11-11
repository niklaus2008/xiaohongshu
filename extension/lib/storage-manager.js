/**
 * 存储管理器
 * 使用chrome.storage API管理配置和数据
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

class StorageManager {
    /**
     * 获取配置
     */
    static async getConfig() {
        try {
            const result = await chrome.storage.sync.get(['config']);
            return result.config || {
                maxImages: 6,
                removeWatermark: true,
                enableProcessing: true
            };
        } catch (error) {
            console.error('获取配置失败:', error);
            return null;
        }
    }

    /**
     * 保存配置
     */
    static async saveConfig(config) {
        try {
            await chrome.storage.sync.set({ config });
            return true;
        } catch (error) {
            console.error('保存配置失败:', error);
            return false;
        }
    }

    /**
     * 获取餐馆列表
     */
    static async getRestaurants() {
        try {
            const result = await chrome.storage.local.get(['restaurants']);
            return result.restaurants || [];
        } catch (error) {
            console.error('获取餐馆列表失败:', error);
            return [];
        }
    }

    /**
     * 保存餐馆列表
     */
    static async saveRestaurants(restaurants) {
        try {
            await chrome.storage.local.set({ restaurants });
            return true;
        } catch (error) {
            console.error('保存餐馆列表失败:', error);
            return false;
        }
    }

    /**
     * 获取AI配置（从local读取，持久化存储）
     */
    static async getAIConfig() {
        try {
            // 从local读取（主要存储）
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
                }
            }
            
            return aiConfig || null;
        } catch (error) {
            console.error('获取AI配置失败:', error);
            return null;
        }
    }

    /**
     * 保存AI配置（保存到local以确保持久化）
     */
    static async saveAIConfig(aiConfig) {
        try {
            // 保存到local（主要存储）
            await chrome.storage.local.set({ aiConfig });
            // 同时尝试保存到sync（用于跨设备同步，但local是主要存储）
            try {
                await chrome.storage.sync.set({ aiConfig });
            } catch (syncError) {
                console.warn('AI配置同步到sync失败（不影响使用）:', syncError);
            }
            return true;
        } catch (error) {
            console.error('保存AI配置失败:', error);
            return false;
        }
    }

    /**
     * 获取下载历史
     */
    static async getDownloadHistory() {
        try {
            const result = await chrome.storage.local.get(['downloadHistory']);
            return result.downloadHistory || [];
        } catch (error) {
            console.error('获取下载历史失败:', error);
            return [];
        }
    }

    /**
     * 保存下载历史
     */
    static async saveDownloadHistory(history) {
        try {
            await chrome.storage.local.set({ downloadHistory: history });
            return true;
        } catch (error) {
            console.error('保存下载历史失败:', error);
            return false;
        }
    }

    /**
     * 添加下载记录
     */
    static async addDownloadRecord(record) {
        try {
            const history = await this.getDownloadHistory();
            history.unshift({
                ...record,
                timestamp: Date.now()
            });
            // 只保留最近100条记录
            if (history.length > 100) {
                history.splice(100);
            }
            await this.saveDownloadHistory(history);
            return true;
        } catch (error) {
            console.error('添加下载记录失败:', error);
            return false;
        }
    }

    /**
     * 清除所有数据
     */
    static async clearAll() {
        try {
            await chrome.storage.sync.clear();
            await chrome.storage.local.clear();
            return true;
        } catch (error) {
            console.error('清除数据失败:', error);
            return false;
        }
    }
}

// 如果在浏览器环境中，导出到全局
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}

// 如果在Node.js环境中，使用module.exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}

