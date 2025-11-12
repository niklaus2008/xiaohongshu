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
            
            // 尝试直接通过URL参数设置排序（最可靠的方法）
            console.log('🏆 尝试通过URL设置"最多点赞"排序...');
            const currentUrl = new URL(window.location.href);
            let needUrlUpdate = false;
            
            // 检查是否需要添加排序参数
            if (!currentUrl.searchParams.has('sort_type') || currentUrl.searchParams.get('sort_type') !== 'hot') {
                currentUrl.searchParams.set('sort_type', 'hot'); // hot=最热，即最多点赞
                needUrlUpdate = true;
            }
            
            // 确保是图文类型
            if (!currentUrl.searchParams.has('type') || currentUrl.searchParams.get('type') !== '51') {
                currentUrl.searchParams.set('type', '51'); // 51=图文
                needUrlUpdate = true;
            }
            
            if (needUrlUpdate) {
                const newUrl = currentUrl.toString();
                console.log(`🔄 更新URL设置排序: ${newUrl}`);
                window.location.href = newUrl;
                await waitForPageLoad();
                await waitForSearchResults();
                console.log('✅ URL排序参数已设置');
            } else {
                console.log('✅ URL已包含正确的排序参数');
            }
            
            // 点击"图文"标签（备用方案）
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
        const { maxImages = 20, filterFaces = true } = data;
        
        console.log('开始提取图片，最大数量:', maxImages, '是否过滤人脸:', filterFaces);
        
        try {
            // 确保页面已加载
            await waitForPageLoad();
            
            // 滚动加载更多内容
            await scrollToLoadMore();
            
            // 提取图片URL（提取更多图片，因为后续会过滤）
            const extractCount = filterFaces ? maxImages * 2 : maxImages; // 如果需要过滤人脸，提取更多图片
            const imageUrls = await extractImageUrls(extractCount);
            
            console.log('提取到图片数量:', imageUrls.length);
            
            // 如果启用人脸过滤，过滤掉包含人脸的图片
            let finalImageUrls = imageUrls;
            if (filterFaces && typeof FaceDetector !== 'undefined' && imageUrls.length > 0) {
                console.log('🔍 开始过滤包含人脸的图片...');
                try {
                    finalImageUrls = await FaceDetector.filterImagesWithoutFaces(imageUrls);
                    // 如果过滤后数量不足，只取前maxImages张
                    if (finalImageUrls.length > maxImages) {
                        finalImageUrls = finalImageUrls.slice(0, maxImages);
                    }
                    console.log('✅ 人脸过滤完成，保留图片数量:', finalImageUrls.length);
                } catch (error) {
                    console.warn('⚠️ 人脸过滤失败，使用原始图片:', error.message);
                    // 如果过滤失败，使用原始图片（只取前maxImages张）
                    finalImageUrls = imageUrls.slice(0, maxImages);
                }
            } else if (imageUrls.length > maxImages) {
                // 如果不需要过滤，只取前maxImages张
                finalImageUrls = imageUrls.slice(0, maxImages);
            }
            
            return {
                success: true,
                imageUrls: finalImageUrls,
                count: finalImageUrls.length,
                originalCount: imageUrls.length
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
     * 点击"最多点赞"排序选项
     */
    async function clickMostLikedSort() {
        return new Promise((resolve) => {
            console.log('🏆 尝试点击"最多点赞"排序选项...');
            
            // 记录点击前的URL，用于验证排序是否生效
            const urlBefore = window.location.href;
            console.log(`📍 排序前URL: ${urlBefore}`);
            
            // 等待页面稳定
            setTimeout(() => {
                // 查找"最多点赞"排序选项
                // 根据小红书页面结构，排序选项通常在右侧边栏
                let sortOptions = null;
                
                // 方法1：通过文本查找
                const allElements = Array.from(document.querySelectorAll('*'));
                for (const el of allElements) {
                    const text = el.textContent || el.innerText || '';
                    // 更精确的匹配：只匹配完全包含"最多点赞"的元素
                    if (text.trim() === '最多点赞' || text.includes('最多点赞')) {
                        const tagName = el.tagName.toLowerCase();
                        if (tagName === 'button' || tagName === 'a' || tagName === 'div' || tagName === 'span' || tagName === 'li') {
                            // 确保元素可见且可点击
                            const rect = el.getBoundingClientRect();
                            if (rect.width > 0 && rect.height > 0) {
                                // 检查是否在排序区域（通常在右侧边栏）
                                const parent = el.closest('[class*="sort"], [class*="filter"], [class*="sidebar"], [class*="aside"]');
                                if (parent || rect.left > window.innerWidth * 0.6) {
                                    sortOptions = el;
                                    break;
                                }
                            }
                        }
                    }
                }
                
                if (sortOptions) {
                    // 滚动到元素可见位置
                    sortOptions.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    setTimeout(() => {
                        try {
                            // 尝试多种点击方式
                            try {
                                sortOptions.click();
                                console.log('✅ 已点击"最多点赞"排序选项（方式1：直接点击）');
                            } catch (error) {
                                // 如果直接点击失败，尝试触发事件
                                const clickEvent = new MouseEvent('click', {
                                    bubbles: true,
                                    cancelable: true,
                                    view: window
                                });
                                sortOptions.dispatchEvent(clickEvent);
                                console.log('✅ 已点击"最多点赞"排序选项（方式2：事件触发）');
                            }
                            
                            // 等待排序结果加载（增加等待时间）
                            console.log('⏳ 等待排序结果加载...');
                            setTimeout(() => {
                                // 验证排序是否生效
                                const urlAfter = window.location.href;
                                console.log(`📍 排序后URL: ${urlAfter}`);
                                
                                // 检查URL参数或页面状态
                                const urlParams = new URLSearchParams(window.location.search);
                                const sortParam = urlParams.get('sort') || urlParams.get('order');
                                
                                // 检查排序按钮是否有active状态
                                const sortButtons = Array.from(document.querySelectorAll('*')).filter(el => {
                                    const text = el.textContent || el.innerText || '';
                                    return text.includes('最多点赞');
                                });
                                
                                const hasActiveSort = sortButtons.some(btn => {
                                    const classes = btn.className || '';
                                    return classes.includes('active') || classes.includes('selected') || classes.includes('current');
                                });
                                
                                if (hasActiveSort || sortParam || urlAfter !== urlBefore) {
                                    console.log('✅ 排序验证成功');
                                } else {
                                    console.warn('⚠️ 排序验证未通过，但继续执行');
                                }
                                
                                // 额外等待，确保排序结果完全加载
                                console.log('⏳ 额外等待排序结果完全加载...');
                                setTimeout(resolve, 3000);
                            }, 5000);
                        } catch (error) {
                            console.warn('⚠️ 点击"最多点赞"排序选项失败:', error.message);
                            console.log('💡 提示：如果搜索结果质量不佳，可能需要手动在小红书页面点击"最多点赞"排序');
                            resolve();
                        }
                    }, 1000);
                } else {
                    console.log('⚠️ 未找到"最多点赞"排序选项，继续使用默认排序');
                    console.log('💡 提示：如果搜索结果质量不佳，可能需要手动在小红书页面点击"最多点赞"排序');
                    resolve();
                }
            }, 3000);
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
            
            /**
             * 检查图片是否应该被过滤掉
             */
            function shouldFilterImage(img, src) {
                const width = img.naturalWidth || img.width || 0;
                const height = img.naturalHeight || img.height || 0;
                
                // 基本尺寸检查
                const isLargeEnough = width > 200 && height > 200;
                if (!isLargeEnough) {
                    return true; // 过滤掉
                }
                
                // URL关键词检查
                const urlLower = src.toLowerCase();
                const isAvatar = urlLower.includes('avatar') || 
                                urlLower.includes('icon') || 
                                urlLower.includes('profile') ||
                                urlLower.includes('head') ||
                                urlLower.includes('user');
                const isSystem = urlLower.includes('logo') || 
                                urlLower.includes('banner') || 
                                urlLower.includes('button');
                const isPerson = urlLower.includes('person') || 
                                urlLower.includes('people') ||
                                urlLower.includes('selfie') ||
                                urlLower.includes('portrait') ||
                                urlLower.includes('face') ||
                                urlLower.includes('headshot');
                
                if (isAvatar || isSystem || isPerson) {
                    return true; // 过滤掉
                }
                
                // 尺寸比例检查（排除正方形小图标）
                const aspectRatio = width > 0 && height > 0 ? width / height : 1;
                const isSquareIcon = aspectRatio > 0.9 && aspectRatio < 1.1 && width < 200 && height < 200;
                if (isSquareIcon) {
                    return true; // 过滤掉
                }
                
                // DOM结构检查（排除头像容器中的图片）
                const isInIconContainer = img.closest('.avatar, .icon, .user-icon, .profile-pic, [class*="avatar"], [class*="user-head"]');
                if (isInIconContainer) {
                    return true; // 过滤掉
                }
                
                // 检查是否在内容区域
                const isInContentArea = img.closest('.note-item, .feed-item, .content-item, .note-card, .search-item, .result-item, article, .card');
                if (!isInContentArea) {
                    return true; // 过滤掉
                }
                
                return false; // 保留
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
                    
                    // 应用过滤规则
                    if (shouldFilterImage(img, src)) {
                        continue; // 跳过这张图片
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

