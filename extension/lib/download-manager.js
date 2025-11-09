/**
 * 下载管理器
 * 使用chrome.downloads API管理图片下载
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

class DownloadManager {
    /**
     * 下载图片
     * @param {string} url - 图片URL
     * @param {string} filename - 文件名
     * @param {Object} options - 下载选项
     * @returns {Promise<number>} 下载ID
     */
    static async downloadImage(url, filename, options = {}) {
        return new Promise((resolve, reject) => {
            chrome.downloads.download({
                url: url,
                filename: filename,
                saveAs: options.saveAs || false,
                conflictAction: options.conflictAction || 'uniquify'
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(downloadId);
                }
            });
        });
    }

    /**
     * 批量下载图片
     * @param {Array<Object>} downloads - 下载项数组 [{url, filename}, ...]
     * @param {Object} options - 下载选项
     * @returns {Promise<Array<number>>} 下载ID数组
     */
    static async downloadImages(downloads, options = {}) {
        const downloadIds = [];
        const delay = options.delay || 1000;

        for (let i = 0; i < downloads.length; i++) {
            const { url, filename } = downloads[i];
            
            try {
                const downloadId = await this.downloadImage(url, filename, options);
                downloadIds.push(downloadId);
                
                // 延迟避免请求过快
                if (i < downloads.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            } catch (error) {
                console.error('下载失败:', url, error);
                downloadIds.push(null);
            }
        }

        return downloadIds;
    }

    /**
     * 取消下载
     * @param {number} downloadId - 下载ID
     */
    static async cancelDownload(downloadId) {
        return new Promise((resolve) => {
            chrome.downloads.cancel(downloadId, () => {
                resolve();
            });
        });
    }

    /**
     * 暂停下载
     * @param {number} downloadId - 下载ID
     */
    static async pauseDownload(downloadId) {
        return new Promise((resolve) => {
            chrome.downloads.pause(downloadId, () => {
                resolve();
            });
        });
    }

    /**
     * 恢复下载
     * @param {number} downloadId - 下载ID
     */
    static async resumeDownload(downloadId) {
        return new Promise((resolve) => {
            chrome.downloads.resume(downloadId, () => {
                resolve();
            });
        });
    }

    /**
     * 获取下载状态
     * @param {number} downloadId - 下载ID
     * @returns {Promise<Object>} 下载状态
     */
    static async getDownloadStatus(downloadId) {
        return new Promise((resolve) => {
            chrome.downloads.search({ id: downloadId }, (results) => {
                if (results && results.length > 0) {
                    resolve(results[0]);
                } else {
                    resolve(null);
                }
            });
        });
    }

    /**
     * 监听下载事件
     * @param {Function} callback - 回调函数
     */
    static onDownloadChanged(callback) {
        chrome.downloads.onChanged.addListener(callback);
    }

    /**
     * 移除下载事件监听
     * @param {Function} callback - 回调函数
     */
    static removeDownloadListener(callback) {
        chrome.downloads.onChanged.removeListener(callback);
    }
}

// 如果在浏览器环境中，导出到全局
if (typeof window !== 'undefined') {
    window.DownloadManager = DownloadManager;
}

// 如果在Node.js环境中，使用module.exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DownloadManager;
}

