/**
 * 测试Cookie验证功能
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');
const fs = require('fs-extra');

async function testCookieValidation() {
    console.log('🍪 测试Cookie验证功能...\n');
    
    const scraper = new XiaohongshuScraper({
        downloadPath: '/Users/liuqiang/code/toolkit/xiaohongshu/test-cookie-downloads',
        maxImages: 2,
        headless: false,
        login: {
            method: 'manual',
            autoLogin: true,
            saveCookies: true,
            cookieFile: '/Users/liuqiang/code/toolkit/xiaohongshu/cookies.json'
        }
    });

    try {
        console.log('🔧 初始化浏览器...');
        await scraper.initBrowser();
        console.log('✅ 浏览器初始化完成\n');

        // 直接测试Cookie加载
        console.log('🍪 测试Cookie加载...');
        const cookieLoaded = await scraper.loadCookies();
        console.log(`Cookie加载结果: ${cookieLoaded}`);

        if (cookieLoaded) {
            console.log('🌐 访问小红书首页验证Cookie...');
            await scraper.page.goto('https://www.xiaohongshu.com/explore', { 
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            await scraper.page.waitForTimeout(5000);

            // 检查页面内容
            const pageInfo = await scraper.page.evaluate(() => {
                return {
                    url: window.location.href,
                    title: document.title,
                    hasLoginPrompt: document.body ? document.body.innerText.includes('登录后查看搜索结果') : false,
                    hasContent: document.querySelectorAll('.note-item, .feed-item, .content-item').length,
                    bodyText: document.body ? document.body.innerText.substring(0, 500) : ''
                };
            });

            console.log('📄 页面信息:', pageInfo);

            if (pageInfo.hasLoginPrompt) {
                console.log('❌ 页面显示登录提示，Cookie可能已失效');
            } else {
                console.log('✅ 页面未显示登录提示，Cookie可能有效');
            }

            // 尝试搜索
            console.log('\n🔍 尝试搜索测试...');
            const searchUrl = 'https://www.xiaohongshu.com/search_result?keyword=海底捞&type=51';
            await scraper.page.goto(searchUrl, { 
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            await scraper.page.waitForTimeout(5000);

            const searchInfo = await scraper.page.evaluate(() => {
                return {
                    url: window.location.href,
                    title: document.title,
                    hasLoginPrompt: document.body ? document.body.innerText.includes('登录后查看搜索结果') : false,
                    hasContent: document.querySelectorAll('.note-item, .feed-item, .content-item, .note-card, .search-item, .result-item, article, .card').length,
                    bodyText: document.body ? document.body.innerText.substring(0, 500) : ''
                };
            });

            console.log('📄 搜索页面信息:', searchInfo);

            if (searchInfo.hasLoginPrompt) {
                console.log('❌ 搜索页面显示登录提示，需要重新登录');
            } else if (searchInfo.hasContent > 0) {
                console.log('✅ 搜索页面有内容，Cookie有效');
            } else {
                console.log('⚠️ 搜索页面无内容，可能Cookie部分失效');
            }
        }

    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
        console.error('详细错误:', error);
    } finally {
        console.log('\n🔚 关闭浏览器...');
        await scraper.close();
        console.log('✅ 测试完成');
    }
}

// 运行测试
testCookieValidation().catch(console.error);