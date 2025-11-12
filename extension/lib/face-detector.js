/**
 * 人脸检测器
 * 使用基于Canvas图像分析的简单人脸检测方法
 * 不依赖外部库，完全本地运行
 * 
 * @author AI Assistant
 * @version 2.0.0
 */

(function() {
    'use strict';

    /**
     * 检测图片中是否包含人脸
     * 使用基于肤色和面部特征的简单检测方法
     * @param {string} imageUrl - 图片URL
     * @returns {Promise<boolean>} 是否包含人脸（true表示包含人脸，false表示不包含）
     */
    async function detectFaceInImage(imageUrl) {
        try {
            // 创建图片元素
            const img = new Image();
            img.crossOrigin = 'anonymous';

            // 等待图片加载
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('图片加载失败'));
                img.src = imageUrl;
                // 设置超时
                setTimeout(() => reject(new Error('图片加载超时')), 10000);
            });

            // 限制图片尺寸以提高性能（最大800x800）
            const maxSize = 800;
            let width = img.width;
            let height = img.height;
            let scale = 1;

            if (width > maxSize || height > maxSize) {
                scale = Math.min(maxSize / width, maxSize / height);
                width = Math.floor(width * scale);
                height = Math.floor(height * scale);
            }

            // 创建canvas并绘制图片
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // 获取像素数据
            const imageData = ctx.getImageData(0, 0, width, height);
            const pixels = imageData.data;

            // 检测人脸
            const hasFace = detectFaceInPixels(pixels, width, height);

            // 清理canvas
            canvas.width = 0;
            canvas.height = 0;

            if (hasFace) {
                console.log(`🚫 检测到人脸，过滤图片: ${imageUrl.substring(0, 50)}...`);
            }
            return hasFace;
        } catch (error) {
            console.warn('⚠️ 人脸检测失败，允许图片通过:', error.message);
            // 如果检测失败，返回false（不包含人脸），允许图片通过
            return false;
        }
    }

    /**
     * 在像素数据中检测人脸
     * @param {Uint8ClampedArray} pixels - 像素数据 (RGBA格式)
     * @param {number} width - 图片宽度
     * @param {number} height - 图片高度
     * @returns {boolean} 是否检测到人脸
     */
    function detectFaceInPixels(pixels, width, height) {
        // 肤色范围（HSV颜色空间，转换为RGB范围）
        // 这里使用简化的肤色检测
        const skinColorRanges = [
            // 浅肤色
            { rMin: 200, rMax: 255, gMin: 150, gMax: 220, bMin: 120, bMax: 200 },
            // 中等肤色
            { rMin: 180, rMax: 240, gMin: 130, gMax: 200, bMin: 100, bMax: 180 },
            // 深肤色
            { rMin: 120, rMax: 200, gMin: 80, gMax: 150, bMin: 60, bMax: 120 }
        ];

        // 统计肤色像素
        let skinPixels = 0;
        const skinPixelMap = new Array(width * height).fill(false);

        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];

            // 跳过透明像素
            if (a < 128) continue;

            // 检查是否为肤色
            const isSkin = skinColorRanges.some(range => 
                r >= range.rMin && r <= range.rMax &&
                g >= range.gMin && g <= range.gMax &&
                b >= range.bMin && b <= range.bMax
            );

            if (isSkin) {
                skinPixels++;
                skinPixelMap[Math.floor(i / 4)] = true;
            }
        }

        // 如果肤色像素太少，不太可能是人脸
        const skinRatio = skinPixels / (width * height);
        if (skinRatio < 0.05 || skinRatio > 0.7) {
            return false; // 肤色像素比例不在合理范围内
        }

        // 检测面部区域（通常在人脸图片的上半部分）
        const faceRegionHeight = Math.floor(height * 0.6); // 上半部分60%
        let faceRegionSkinPixels = 0;

        for (let y = 0; y < faceRegionHeight; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                if (skinPixelMap[index]) {
                    faceRegionSkinPixels++;
                }
            }
        }

        const faceRegionSkinRatio = faceRegionSkinPixels / (width * faceRegionHeight);
        
        // 如果面部区域的肤色比例较高，可能是人脸
        if (faceRegionSkinRatio > 0.15) {
            // 进一步检测：检查是否有对称的肤色区域（类似眼睛、嘴巴）
            const symmetryScore = checkSymmetry(skinPixelMap, width, height);
            
            // 如果对称性较高，更可能是人脸
            if (symmetryScore > 0.3) {
                return true;
            }
        }

        return false;
    }

    /**
     * 检查图像的对称性（人脸通常比较对称）
     * @param {Array<boolean>} skinPixelMap - 肤色像素映射
     * @param {number} width - 图片宽度
     * @param {number} height - 图片高度
     * @returns {number} 对称性得分 (0-1)
     */
    function checkSymmetry(skinPixelMap, width, height) {
        let symmetricPixels = 0;
        let totalSkinPixels = 0;

        const centerX = Math.floor(width / 2);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < centerX; x++) {
                const leftIndex = y * width + x;
                const rightIndex = y * width + (width - 1 - x);

                if (skinPixelMap[leftIndex] || skinPixelMap[rightIndex]) {
                    totalSkinPixels++;
                    if (skinPixelMap[leftIndex] && skinPixelMap[rightIndex]) {
                        symmetricPixels++;
                    }
                }
            }
        }

        return totalSkinPixels > 0 ? symmetricPixels / totalSkinPixels : 0;
    }

    /**
     * 批量检测图片中是否包含人脸
     * @param {Array<string>} imageUrls - 图片URL数组
     * @returns {Promise<Array<string>>} 不包含人脸的图片URL数组
     */
    async function filterImagesWithoutFaces(imageUrls) {
        if (!imageUrls || imageUrls.length === 0) {
            return [];
        }

        console.log(`🔍 开始检测 ${imageUrls.length} 张图片中的人脸（使用本地检测方法）...`);

        const filteredUrls = [];
        let detectedCount = 0;

        for (const url of imageUrls) {
            try {
                const hasFace = await detectFaceInImage(url);
                if (!hasFace) {
                    filteredUrls.push(url);
                } else {
                    detectedCount++;
                }
            } catch (error) {
                // 如果检测失败，默认允许图片通过
                console.warn('检测图片失败，允许通过:', error.message);
                filteredUrls.push(url);
            }
        }

        console.log(`✅ 人脸检测完成: 总共${imageUrls.length}张，过滤${detectedCount}张包含人脸的图片，保留${filteredUrls.length}张`);
        return filteredUrls;
    }

    // 导出到全局
    window.FaceDetector = {
        detectFaceInImage: detectFaceInImage,
        filterImagesWithoutFaces: filterImagesWithoutFaces,
        isModelLoaded: () => true // 本地方法，始终可用
    };

    console.log('✅ FaceDetector 已加载（使用本地检测方法）');
})();
