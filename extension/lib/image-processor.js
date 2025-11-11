/**
 * 图片处理器
 * 使用Canvas API处理图片，去除水印等
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

class ImageProcessor {
    /**
     * 处理图片，去除水印
     * @param {string} imageUrl - 图片URL
     * @param {Object} options - 处理选项
     * @returns {Promise<Blob>} 处理后的图片Blob
     */
    static async processImage(imageUrl, options = {}) {
        const {
            removeWatermark = true,
            cropWatermark = true,
            watermarkRegion = { width: 0.15, height: 0.10 } // 右下角15%宽度 × 10%高度
        } = options;

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    if (removeWatermark && cropWatermark) {
                        // 裁剪去除右下角水印区域（保留左上部分）
                        const cropWidth = Math.floor(img.width * (1 - watermarkRegion.width));
                        const cropHeight = Math.floor(img.height * (1 - watermarkRegion.height));
                        
                        canvas.width = cropWidth;
                        canvas.height = cropHeight;
                        
                        // 绘制裁剪后的图片（从左上角开始，裁剪掉右下角）
                        ctx.drawImage(
                            img,
                            0, 0, cropWidth, cropHeight,  // 源图片区域
                            0, 0, cropWidth, cropHeight   // 目标画布区域
                        );
                    } else {
                        // 不裁剪，直接绘制原图
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);
                    }

                    // 转换为Blob（高质量JPEG）
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('图片处理失败'));
                        }
                    }, 'image/jpeg', 0.95);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => {
                reject(new Error('图片加载失败'));
            };

            img.src = imageUrl;
        });
    }

    /**
     * 将图片URL转换为Blob URL（用于下载）
     * @param {string} imageUrl - 图片URL
     * @param {Object} options - 处理选项
     * @returns {Promise<string>} Blob URL
     */
    static async processImageToBlobUrl(imageUrl, options = {}) {
        const blob = await this.processImage(imageUrl, options);
        return URL.createObjectURL(blob);
    }

    /**
     * 在Worker中处理图片（用于大图片）
     * @param {string} imageUrl - 图片URL
     * @param {Object} options - 处理选项
     * @returns {Promise<Blob>} 处理后的图片Blob
     */
    static async processImageInWorker(imageUrl, options = {}) {
        // 注意：Worker中无法直接使用Canvas，需要先在主线程中加载图片
        // 这里提供一个简化的实现
        return this.processImage(imageUrl, options);
    }

    /**
     * 批量处理图片
     * @param {Array<string>} imageUrls - 图片URL数组
     * @param {Object} options - 处理选项
     * @returns {Promise<Array<Blob>>} 处理后的图片Blob数组
     */
    static async processImages(imageUrls, options = {}) {
        const results = [];
        
        for (const url of imageUrls) {
            try {
                const processed = await this.processImage(url, options);
                results.push(processed);
            } catch (error) {
                console.error('处理图片失败:', url, error);
                results.push(null);
            }
        }
        
        return results;
    }

    /**
     * 创建Worker代码（用于在Worker中处理图片）
     */
    static getWorkerCode() {
        return `
            self.onmessage = function(e) {
                const { imageData, options } = e.data;
                // Worker中的图片处理逻辑
                // 注意：Worker中无法直接使用Canvas，需要将图片数据转换为ImageData
                self.postMessage({ success: true, processedData: imageData });
            };
        `;
    }
}

// 如果在浏览器环境中，导出到全局
if (typeof window !== 'undefined') {
    window.ImageProcessor = ImageProcessor;
}

// 如果在Node.js环境中，使用module.exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageProcessor;
}

