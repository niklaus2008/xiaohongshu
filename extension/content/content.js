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
     * 处理搜索请求
     */
    async function handleSearch(data) {
        const { restaurantName, location } = data;
        const searchKeyword = location ? `${restaurantName} ${location}` : restaurantName;
        
        console.log('开始搜索:', searchKeyword);
        
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
                // 尝试从lib目录加载
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('lib/image-processor.js');
                document.head.appendChild(script);
                
                // 等待脚本加载
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                    setTimeout(reject, 5000); // 5秒超时
                });
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
     */
    function extractImageUrls(maxImages) {
        return new Promise((resolve) => {
            // 查找所有图片元素
            const images = document.querySelectorAll('img[src*="xiaohongshu"], img[src*="xhscdn"], .note-item img, .feed-item img, article img');
            
            const imageUrls = [];
            const seenUrls = new Set();
            
            for (const img of images) {
                if (imageUrls.length >= maxImages) break;
                
                let src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original');
                
                if (!src || seenUrls.has(src)) continue;
                
                // 处理水印URL - 移除水印相关参数
                src = removeWatermarkParams(src);
                
                // 只保留有效的图片URL
                if (src && (src.includes('http') || src.startsWith('//'))) {
                    if (src.startsWith('//')) {
                        src = 'https:' + src;
                    }
                    imageUrls.push(src);
                    seenUrls.add(src);
                }
            }
            
            // 如果图片数量不足，尝试其他选择器
            if (imageUrls.length < maxImages) {
                const moreImages = document.querySelectorAll('img');
                for (const img of moreImages) {
                    if (imageUrls.length >= maxImages) break;
                    
                    let src = img.src || img.getAttribute('data-src');
                    if (!src || seenUrls.has(src)) continue;
                    
                    // 只保留小红书相关的图片
                    if (src.includes('xiaohongshu') || src.includes('xhscdn')) {
                        src = removeWatermarkParams(src);
                        if (src.startsWith('//')) {
                            src = 'https:' + src;
                        }
                        imageUrls.push(src);
                        seenUrls.add(src);
                    }
                }
            }
            
            resolve(imageUrls);
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

