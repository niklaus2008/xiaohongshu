/**
 * Content Script - 在小红书页面中运行
 * 负责搜索、提取图片URL、操作DOM等
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

(function() {
    'use strict';

    // 全局状态
    let isProcessing = false;
    let currentSearchKeyword = null;

    /**
     * 初始化Content Script
     */
    function init() {
        console.log('小红书餐馆图片下载工具 - Content Script 已加载');
        
        // 监听来自background script的消息
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'search') {
                handleSearch(message.data).then(result => {
                    sendResponse(result);
                }).catch(error => {
                    sendResponse({ success: false, error: error.message });
                });
                return true; // 保持消息通道开放
            } else if (message.action === 'extractImages') {
                handleExtractImages(message.data).then(result => {
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
            } else if (message.action === 'copyToClipboard') {
                // 复制文本到剪贴板
                navigator.clipboard.writeText(message.text).then(() => {
                    sendResponse({ success: true });
                }).catch(error => {
                    // 如果clipboard API失败，使用传统方法
                    const textArea = document.createElement('textarea');
                    textArea.value = message.text;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    document.body.appendChild(textArea);
                    textArea.select();
                    try {
                        document.execCommand('copy');
                        sendResponse({ success: true });
                    } catch (err) {
                        sendResponse({ success: false, error: err.message });
                    }
                    document.body.removeChild(textArea);
                });
                return true;
            } else if (message.action === 'processImage') {
                // 处理图片（去水印）
                handleProcessImage(message.data).then(result => {
                    sendResponse(result);
                }).catch(error => {
                    sendResponse({ success: false, error: error.message });
                });
                return true;
            }
        });

        // 添加浮动操作按钮
        addFloatingButton();
    }

    /**
     * 智能构建搜索关键词
     * 考虑餐馆名称中的地址信息和门店信息，避免重复
     * @param {string} restaurantName - 餐馆名称（可能包含地址信息）
     * @param {string} location - 地点信息
     * @returns {string} 优化后的搜索关键词
     */
    function buildSearchKeyword(restaurantName, location) {
        // 门店相关关键词，用于识别门店信息
        const storeKeywords = ['店', '门店', '分店', '路', '街', '区', '市', '省', '广场', '中心', '大厦', '商场'];
        
        // 提取餐馆名称中的地址信息
        let nameParts = restaurantName.trim();
        let locationParts = location ? location.trim() : '';
        
        // 如果location为空或已在餐馆名称中包含，则只使用餐馆名称
        if (!locationParts || nameParts.includes(locationParts)) {
            // 餐馆名称已包含地址信息，直接使用
            return nameParts;
        }
        
        // 检查餐馆名称中是否包含门店关键词
        const nameHasStoreInfo = storeKeywords.some(keyword => nameParts.includes(keyword));
        const locationHasStoreInfo = storeKeywords.some(keyword => locationParts.includes(keyword));
        
        // 如果餐馆名称中已有门店信息，优先使用餐馆名称，location作为补充
        if (nameHasStoreInfo) {
            // 餐馆名称已包含门店信息，将location作为补充（如果location包含更多信息）
            // 提取location中的关键信息（去除与name重复的部分）
            const locationWords = locationParts.split(/[\s，,、]/).filter(word => word.length > 0);
            const nameWords = nameParts.split(/[\s，,、]/).filter(word => word.length > 0);
            
            // 找出location中不重复的关键词
            const uniqueLocationWords = locationWords.filter(word => 
                !nameWords.some(nameWord => nameWord.includes(word) || word.includes(nameWord))
            );
            
            if (uniqueLocationWords.length > 0) {
                return `${nameParts} ${uniqueLocationWords.join(' ')}`;
            }
            return nameParts;
        } else if (locationHasStoreInfo) {
            // location包含门店信息，组合使用
            return `${nameParts} ${locationParts}`;
        } else {
            // 两者都没有明显的门店信息，组合使用
            return `${nameParts} ${locationParts}`;
        }
    }

    /**
     * 处理搜索请求
     */
    async function handleSearch(data) {
        const { restaurantName, location } = data;
        
        // 智能构建搜索关键词，考虑门店信息
        let searchKeyword = buildSearchKeyword(restaurantName, location);
        
        // 如果关键词中不包含食物相关词汇，则添加"食物"关键词
        const foodKeywords = ['食物', '美食', '菜品', '菜', '吃', '美食推荐', '美食探店'];
        const hasFoodKeyword = foodKeywords.some(keyword => searchKeyword.includes(keyword));
        if (!hasFoodKeyword) {
            searchKeyword = `${searchKeyword} 食物`;
        }
        
        console.log('开始搜索（已考虑门店信息）:', searchKeyword);
        
        try {
            // 构建搜索URL
            const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(searchKeyword)}&type=51`;
            
            // 如果当前不在搜索页面，导航到搜索页面
            if (!window.location.href.includes('search_result')) {
                window.location.href = searchUrl;
                // 等待页面加载
                await waitForPageLoad();
            } else {
                // 如果已经在搜索页面，更新搜索关键词
                const currentKeyword = new URLSearchParams(window.location.search).get('keyword');
                if (currentKeyword !== searchKeyword) {
                    window.location.href = searchUrl;
                    await waitForPageLoad();
                }
            }
            
            // 等待搜索结果加载
            await waitForSearchResults();
            
            // 点击"图文"标签（如果存在）
            await clickImageTab();
            
            // 滚动加载更多内容
            await scrollToLoadMore();
            
            return {
                success: true,
                keyword: searchKeyword,
                url: window.location.href
            };
        } catch (error) {
            console.error('搜索失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 处理提取图片请求
     */
    async function handleExtractImages(data) {
        const { maxImages = 20 } = data;
        
        console.log('开始提取图片，最大数量:', maxImages);
        
        try {
            // 确保页面已加载
            await waitForPageLoad();
            
            // 滚动加载更多内容
            await scrollToLoadMore();
            
            // 提取图片URL
            const imageUrls = await extractImageUrls(maxImages);
            
            console.log('提取到图片数量:', imageUrls.length);
            
            return {
                success: true,
                imageUrls,
                count: imageUrls.length
            };
        } catch (error) {
            console.error('提取图片失败:', error);
            return {
                success: false,
                error: error.message,
                imageUrls: []
            };
        }
    }

    /**
     * 处理图片（去水印）
     * @param {Object} data - 处理数据
     * @param {string} data.imageUrl - 图片URL
     * @param {boolean} data.removeWatermark - 是否去水印
     * @param {boolean} data.enableProcessing - 是否启用处理
     * @returns {Promise<Object>} 处理结果
     */
    async function handleProcessImage(data) {
        const { imageUrl, removeWatermark = true, enableProcessing = true } = data;
        
        try {
            // 加载ImageProcessor（如果已加载）
            if (typeof ImageProcessor === 'undefined') {
                // 检查脚本是否已经在加载中
                const existingScript = document.querySelector('script[src*="image-processor.js"]');
                if (existingScript) {
                    // 等待现有脚本加载完成
                    await new Promise((resolve, reject) => {
                        const checkInterval = setInterval(() => {
                            if (typeof ImageProcessor !== 'undefined') {
                                clearInterval(checkInterval);
                                resolve();
                            }
                        }, 100);
                        setTimeout(() => {
                            clearInterval(checkInterval);
                            if (typeof ImageProcessor === 'undefined') {
                                reject(new Error('ImageProcessor加载超时'));
                            } else {
                                resolve();
                            }
                        }, 5000);
                    });
                } else {
                    // 尝试从lib目录加载
                    try {
                        const script = document.createElement('script');
                        script.src = chrome.runtime.getURL('lib/image-processor.js');
                        
                        // 改进错误处理
                        await new Promise((resolve, reject) => {
                            script.onload = () => {
                                // 等待一小段时间确保ImageProcessor已定义
                                setTimeout(() => {
                                    if (typeof ImageProcessor !== 'undefined') {
                                        resolve();
                                    } else {
                                        reject(new Error('ImageProcessor未定义'));
                                    }
                                }, 100);
                            };
                            script.onerror = (error) => {
                                // 静默处理错误，不抛出异常
                                console.warn('ImageProcessor脚本加载失败，可能已在manifest中加载:', error);
                                // 检查是否已经通过manifest加载
                                if (typeof ImageProcessor !== 'undefined') {
                                    resolve();
                                } else {
                                    reject(new Error('ImageProcessor加载失败'));
                                }
                            };
                            document.head.appendChild(script);
                            setTimeout(() => {
                                if (typeof ImageProcessor !== 'undefined') {
                                    resolve();
                                } else {
                                    reject(new Error('ImageProcessor加载超时'));
                                }
                            }, 5000);
                        });
                    } catch (loadError) {
                        // 如果动态加载失败，检查是否已经通过manifest加载
                        if (typeof ImageProcessor !== 'undefined') {
                            // 已经加载，继续
                        } else {
                            throw new Error('ImageProcessor无法加载: ' + loadError.message);
                        }
                    }
                }
            }
            
            if (removeWatermark || enableProcessing) {
                // 使用ImageProcessor处理图片
                const blob = await ImageProcessor.processImage(imageUrl, {
                    removeWatermark: removeWatermark,
                    cropWatermark: true,
                    watermarkRegion: { width: 0.15, height: 0.10 }
                });
                
                // 创建Blob URL
                const blobUrl = URL.createObjectURL(blob);
                
                return {
                    success: true,
                    blobUrl: blobUrl,
                    originalUrl: imageUrl
                };
            } else {
                // 不处理，直接返回原URL
                return {
                    success: true,
                    blobUrl: imageUrl,
                    originalUrl: imageUrl
                };
            }
        } catch (error) {
            console.error('图片处理失败:', error);
            return {
                success: false,
                error: error.message,
                originalUrl: imageUrl
            };
        }
    }

    /**
     * 检查登录状态
     */
    async function handleCheckLoginStatus() {
        try {
            // 检查页面是否有登录提示
            const hasLoginPrompt = document.body.innerText.includes('登录后查看') ||
                                 document.body.innerText.includes('扫码登录') ||
                                 document.body.innerText.includes('手机号登录') ||
                                 document.querySelector('.login-container') !== null;
            
            // 检查是否有用户相关元素
            const hasUserElements = document.querySelector('.user-info') !== null ||
                                  document.querySelector('[class*="user"]') !== null ||
                                  document.querySelector('[class*="avatar"]') !== null;
            
            // 检查Cookie
            const cookies = await getCookies();
            const hasValidCookies = cookies.length > 0;
            
            const loggedIn = !hasLoginPrompt && (hasUserElements || hasValidCookies);
            
            return {
                success: true,
                loggedIn,
                hasLoginPrompt,
                hasUserElements,
                cookieCount: cookies.length
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
     * 等待页面加载完成
     */
    function waitForPageLoad() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve, { once: true });
            }
        });
    }

    /**
     * 等待搜索结果加载
     */
    function waitForSearchResults() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                // 检查是否有搜索结果
                const hasResults = document.querySelectorAll('.note-item, .feed-item, .content-item, article, [class*="note"]').length > 0;
                const hasImages = document.querySelectorAll('img[src*="xiaohongshu"]').length > 0;
                
                if (hasResults || hasImages) {
                    clearInterval(checkInterval);
                    setTimeout(resolve, 2000); // 额外等待2秒确保内容加载完成
                }
            }, 500);
            
            // 最多等待10秒
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 10000);
        });
    }

    /**
     * 点击"图文"标签
     */
    async function clickImageTab() {
        return new Promise((resolve) => {
            // 查找"图文"标签
            const imageTab = Array.from(document.querySelectorAll('a, button, div')).find(el => {
                const text = el.textContent || el.innerText;
                return text.includes('图文') || text.includes('图片');
            });
            
            if (imageTab) {
                imageTab.click();
                setTimeout(resolve, 2000);
            } else {
                resolve();
            }
        });
    }

    /**
     * 滚动加载更多内容
     */
    async function scrollToLoadMore() {
        return new Promise((resolve) => {
            let scrollCount = 0;
            const maxScrolls = 10;
            const scrollInterval = setInterval(() => {
                window.scrollBy(0, 500);
                scrollCount++;
                
                if (scrollCount >= maxScrolls) {
                    clearInterval(scrollInterval);
                    setTimeout(resolve, 2000);
                }
            }, 1000);
        });
    }

    /**
     * 提取图片URL
     * 优先提取笔记内容包含食物关键词的图片
     */
    function extractImageUrls(maxImages) {
        return new Promise((resolve) => {
            // 食物相关关键词，用于识别食物相关的笔记
            const foodKeywords = ['食物', '美食', '菜品', '菜', '吃', '美食推荐', '美食探店', '餐厅', '料理', '菜谱', '味道', '口感', '推荐', '好吃', '美味'];
            
            /**
             * 检查元素或其父元素是否包含食物关键词
             */
            function containsFoodKeyword(element) {
                // 向上查找笔记容器（通常包含标题和内容）
                let container = element;
                for (let i = 0; i < 5 && container; i++) {
                    const text = container.textContent || container.innerText || '';
                    const hasFoodKeyword = foodKeywords.some(keyword => text.includes(keyword));
                    if (hasFoodKeyword) {
                        return true;
                    }
                    container = container.parentElement;
                }
                return false;
            }
            
            // 查找所有图片元素
            const images = document.querySelectorAll('img[src*="xiaohongshu"], img[src*="xhscdn"], .note-item img, .feed-item img, article img');
            
            const imageUrls = [];
            const foodImageUrls = []; // 优先的食物图片
            const seenUrls = new Set();
            
            // 第一遍：优先提取食物相关的图片
            for (const img of images) {
                let src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original');
                
                if (!src || seenUrls.has(src)) continue;
                
                // 处理水印URL - 移除水印相关参数
                src = removeWatermarkParams(src);
                
                // 只保留有效的图片URL
                if (src && (src.includes('http') || src.startsWith('//'))) {
                    if (src.startsWith('//')) {
                        src = 'https:' + src;
                    }
                    
                    // 检查是否来自食物相关的笔记
                    if (containsFoodKeyword(img)) {
                        foodImageUrls.push(src);
                    } else {
                        imageUrls.push(src);
                    }
                    seenUrls.add(src);
                }
            }
            
            // 合并结果：优先使用食物图片，不足时补充其他图片
            const finalImageUrls = [];
            // 先添加食物相关图片
            for (let i = 0; i < foodImageUrls.length && finalImageUrls.length < maxImages; i++) {
                finalImageUrls.push(foodImageUrls[i]);
            }
            // 再添加其他图片直到达到最大数量
            for (let i = 0; i < imageUrls.length && finalImageUrls.length < maxImages; i++) {
                finalImageUrls.push(imageUrls[i]);
            }
            
            // 如果图片数量不足，尝试其他选择器
            if (finalImageUrls.length < maxImages) {
                const moreImages = document.querySelectorAll('img');
                for (const img of moreImages) {
                    if (finalImageUrls.length >= maxImages) break;
                    
                    let src = img.src || img.getAttribute('data-src');
                    if (!src || seenUrls.has(src)) continue;
                    
                    // 只保留小红书相关的图片
                    if (src.includes('xiaohongshu') || src.includes('xhscdn')) {
                        src = removeWatermarkParams(src);
                        if (src.startsWith('//')) {
                            src = 'https:' + src;
                        }
                        finalImageUrls.push(src);
                        seenUrls.add(src);
                    }
                }
            }
            
            console.log(`提取图片完成: 总共${finalImageUrls.length}张，其中食物相关${foodImageUrls.length}张`);
            resolve(finalImageUrls);
        });
    }

    /**
     * 移除水印相关参数
     */
    function removeWatermarkParams(url) {
        try {
            const urlObj = new URL(url);
            
            // 移除水印相关参数
            const watermarkParams = ['watermark', 'wm', 'mark', 'logo', 'w', 'h', 'width', 'height', 'compress', 'resize', 'crop'];
            watermarkParams.forEach(param => {
                urlObj.searchParams.delete(param);
            });
            
            return urlObj.toString();
        } catch (error) {
            // 如果URL解析失败，尝试简单的字符串替换
            return url.replace(/[?&](watermark|wm|mark|logo|w|h|width|height|compress|resize|crop)=[^&]*/g, '');
        }
    }

    /**
     * 获取Cookie
     */
    function getCookies() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'getCookies',
                url: window.location.origin
            }, (response) => {
                if (response && response.success) {
                    resolve(response.cookies || []);
                } else {
                    resolve([]);
                }
            });
        });
    }

    /**
     * 添加浮动操作按钮
     */
    function addFloatingButton() {
        // 检查是否已存在按钮
        if (document.getElementById('xhs-download-float-btn')) {
            return;
        }
        
        const button = document.createElement('div');
        button.id = 'xhs-download-float-btn';
        button.innerHTML = '⬇️';
        button.title = '小红书图片下载工具';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: transform 0.2s;
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
        });
        
        button.addEventListener('click', () => {
            // 打开popup（通过发送消息到background）
            chrome.runtime.sendMessage({
                action: 'openPopup'
            });
        });
        
        document.body.appendChild(button);
    }

    // 初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

