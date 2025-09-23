/**
 * 详细调试搜索和图片提取功能
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');
const fs = require('fs-extra');

async function debugSearchDetailed() {
    console.log('🔍 开始详细调试搜索功能...\n');
    
    const scraper = new XiaohongshuScraper({
        downloadPath: '/Users/liuqiang/code/toolkit/xiaohongshu/debug-downloads',
        maxImages: 5,
        headless: false, // 显示浏览器窗口
        delay: 3000,
        login: {
            method: 'manual',
            autoLogin: true,
            saveCookies: true,
            cookieFile: './cookies.json'
        }
    });

    try {
        console.log('🔧 初始化浏览器...');
        await scraper.initBrowser();
        console.log('✅ 浏览器初始化完成\n');

        // 1. 检查登录状态
        console.log('🔐 检查登录状态...');
        const isLoggedIn = await scraper.checkLoginStatus();
        if (!isLoggedIn) {
            console.log('❌ 未登录，无法继续测试');
            return;
        }
        console.log('✅ 登录状态正常\n');

        // 2. 访问小红书首页
        console.log('🌐 访问小红书首页...');
        await scraper.page.goto('https://www.xiaohongshu.com/explore', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        await scraper.page.waitForTimeout(5000);
        
        // 获取首页信息
        const homePageInfo = await scraper.page.evaluate(() => {
            return {
                url: window.location.href,
                title: document.title,
                hasContent: document.querySelectorAll('.note-item, .feed-item, .content-item').length,
                hasImages: document.querySelectorAll('img[src*="http"]').length,
                bodyText: document.body ? document.body.innerText.substring(0, 1000) : ''
            };
        });
        console.log('📄 首页信息:', homePageInfo);

        // 3. 尝试搜索
        console.log('\n🔍 尝试搜索功能...');
        const searchKeyword = '海底捞 北京朝阳区';
        const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(searchKeyword)}&type=51`;
        
        console.log(`📝 搜索URL: ${searchUrl}`);
        await scraper.page.goto(searchUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        await scraper.page.waitForTimeout(5000);

        // 获取搜索页面信息
        const searchPageInfo = await scraper.page.evaluate(() => {
            return {
                url: window.location.href,
                title: document.title,
                hasContent: document.querySelectorAll('.note-item, .feed-item, .content-item, .note-card, .search-item, .result-item, article, .card').length,
                hasImages: document.querySelectorAll('img[src*="http"]').length,
                bodyText: document.body ? document.body.innerText.substring(0, 1000) : '',
                hasLoginPrompt: document.body ? document.body.innerText.includes('登录后查看搜索结果') : false
            };
        });
        console.log('📄 搜索页面信息:', searchPageInfo);

        // 4. 检查是否有登录提示
        if (searchPageInfo.hasLoginPrompt) {
            console.log('⚠️ 检测到登录提示，可能需要重新登录');
        }

        // 5. 尝试滚动加载更多内容
        console.log('\n📜 滚动页面加载更多内容...');
        for (let i = 0; i < 5; i++) {
            await scraper.page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });
            await scraper.page.waitForTimeout(2000);
            
            const currentContent = await scraper.page.evaluate(() => {
                return {
                    hasContent: document.querySelectorAll('.note-item, .feed-item, .content-item, .note-card, .search-item, .result-item, article, .card').length,
                    hasImages: document.querySelectorAll('img[src*="http"]').length
                };
            });
            console.log(`📊 滚动第${i+1}次后: ${currentContent.hasContent} 个内容, ${currentContent.hasImages} 张图片`);
        }

        // 6. 详细分析页面结构
        console.log('\n🔍 详细分析页面结构...');
        const pageStructure = await scraper.page.evaluate(() => {
            const structure = {
                allElements: document.querySelectorAll('*').length,
                divs: document.querySelectorAll('div').length,
                images: document.querySelectorAll('img').length,
                links: document.querySelectorAll('a').length,
                buttons: document.querySelectorAll('button').length,
                inputs: document.querySelectorAll('input').length,
                contentSelectors: {},
                imageUrls: []
            };

            // 检查各种内容选择器
            const contentSelectors = [
                '.note-item', '.feed-item', '.content-item', '.note-card', 
                '.search-item', '.result-item', 'article', '.card', '.note', '.feed'
            ];
            
            contentSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                structure.contentSelectors[selector] = elements.length;
            });

            // 收集所有图片URL
            document.querySelectorAll('img').forEach(img => {
                if (img.src && img.src.includes('http')) {
                    structure.imageUrls.push({
                        src: img.src,
                        width: img.naturalWidth || img.width || 0,
                        height: img.naturalHeight || img.height || 0,
                        alt: img.alt || ''
                    });
                }
            });

            return structure;
        });

        console.log('📊 页面结构分析:', JSON.stringify(pageStructure, null, 2));

        // 7. 尝试手动点击"图文"标签
        console.log('\n📸 尝试点击"图文"标签...');
        try {
            const imageTabSelectors = [
                'text=图文',
                '[data-testid*="image"]',
                '.tab:has-text("图文")',
                'button:has-text("图文")',
                'div:has-text("图文")'
            ];
            
            let clicked = false;
            for (const selector of imageTabSelectors) {
                try {
                    const element = await scraper.page.waitForSelector(selector, { timeout: 3000 });
                    if (element) {
                        await element.click();
                        console.log(`✅ 成功点击图文标签: ${selector}`);
                        clicked = true;
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }
            
            if (!clicked) {
                console.log('⚠️ 未找到图文标签');
            }
            
            await scraper.page.waitForTimeout(3000);
            
        } catch (error) {
            console.log('⚠️ 点击图文标签失败:', error.message);
        }

        // 8. 最终检查
        console.log('\n🔍 最终检查页面内容...');
        const finalCheck = await scraper.page.evaluate(() => {
            return {
                url: window.location.href,
                title: document.title,
                hasContent: document.querySelectorAll('.note-item, .feed-item, .content-item, .note-card, .search-item, .result-item, article, .card').length,
                hasImages: document.querySelectorAll('img[src*="http"]').length,
                bodyText: document.body ? document.body.innerText.substring(0, 500) : ''
            };
        });
        console.log('📄 最终页面信息:', finalCheck);

        // 9. 尝试提取图片
        console.log('\n📸 尝试提取图片...');
        const imageUrls = await scraper.extractImageUrls();
        console.log(`📸 提取到 ${imageUrls.length} 张图片`);
        
        if (imageUrls.length > 0) {
            console.log('📸 图片URL列表:');
            imageUrls.forEach((url, index) => {
                console.log(`  ${index + 1}. ${url}`);
            });
        }

    } catch (error) {
        console.error('❌ 调试过程中发生错误:', error.message);
        console.error('详细错误:', error);
    } finally {
        console.log('\n🔚 关闭浏览器...');
        await scraper.close();
        console.log('✅ 调试完成');
    }
}

// 运行调试
debugSearchDetailed().catch(console.error);