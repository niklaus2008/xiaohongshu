/**
 * 改进的搜索测试
 * 使用不同的搜索策略和等待时间
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

async function improvedSearchTest() {
    console.log('🔍 开始改进的搜索测试...\n');
    
    const scraper = new XiaohongshuScraper({
        downloadPath: '/Users/liuqiang/code/toolkit/xiaohongshu/improved-downloads',
        maxImages: 3,
        headless: false, // 显示浏览器窗口
        delay: 5000, // 增加延迟时间
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

        // 检查登录状态
        console.log('🔐 检查登录状态...');
        const isLoggedIn = await scraper.checkLoginStatus();
        if (!isLoggedIn) {
            console.log('❌ 未登录，请先运行 refresh-cookies.js 获取有效Cookie');
            return;
        }
        console.log('✅ 登录状态正常\n');

        // 策略1：先访问首页，等待更长时间
        console.log('🌐 访问小红书首页...');
        await scraper.page.goto('https://www.xiaohongshu.com/explore', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        await scraper.page.waitForTimeout(10000); // 等待10秒让页面完全加载

        // 策略2：尝试通过搜索框搜索
        console.log('🔍 尝试通过搜索框搜索...');
        try {
            // 查找搜索框
            const searchInput = await scraper.page.waitForSelector('input[placeholder*="搜索"], input[placeholder*="小红书"]', { timeout: 10000 });
            if (searchInput) {
                await searchInput.click();
                await searchInput.fill('海底捞');
                await searchInput.press('Enter');
                console.log('✅ 通过搜索框搜索成功');
                await scraper.page.waitForTimeout(10000); // 等待搜索结果加载
            }
        } catch (error) {
            console.log('⚠️ 搜索框搜索失败，尝试直接访问搜索页面');
        }

        // 策略3：直接访问搜索页面
        console.log('🔍 直接访问搜索页面...');
        const searchUrl = 'https://www.xiaohongshu.com/search_result?keyword=海底捞&type=51';
        await scraper.page.goto(searchUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        await scraper.page.waitForTimeout(10000); // 等待更长时间

        // 策略4：尝试点击"图文"标签
        console.log('📸 尝试点击"图文"标签...');
        try {
            const imageTab = await scraper.page.waitForSelector('text=图文', { timeout: 5000 });
            if (imageTab) {
                await imageTab.click();
                console.log('✅ 成功点击图文标签');
                await scraper.page.waitForTimeout(5000);
            }
        } catch (error) {
            console.log('⚠️ 未找到图文标签');
        }

        // 策略5：滚动页面加载更多内容
        console.log('📜 滚动页面加载更多内容...');
        for (let i = 0; i < 10; i++) {
            await scraper.page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });
            await scraper.page.waitForTimeout(3000);
            
            const currentContent = await scraper.page.evaluate(() => {
                return {
                    hasContent: document.querySelectorAll('.note-item, .feed-item, .content-item, .note-card, .search-item, .result-item, article, .card').length,
                    hasImages: document.querySelectorAll('img[src*="http"]').length
                };
            });
            console.log(`📊 滚动第${i+1}次后: ${currentContent.hasContent} 个内容, ${currentContent.hasImages} 张图片`);
            
            if (currentContent.hasContent > 0) {
                console.log('✅ 找到内容，停止滚动');
                break;
            }
        }

        // 最终检查
        console.log('\n🔍 最终检查页面内容...');
        const finalCheck = await scraper.page.evaluate(() => {
            return {
                url: window.location.href,
                title: document.title,
                hasContent: document.querySelectorAll('.note-item, .feed-item, .content-item, .note-card, .search-item, .result-item, article, .card').length,
                hasImages: document.querySelectorAll('img[src*="http"]').length,
                bodyText: document.body ? document.body.innerText.substring(0, 1000) : ''
            };
        });
        console.log('📄 最终页面信息:', finalCheck);

        // 尝试提取图片
        if (finalCheck.hasContent > 0) {
            console.log('\n📸 尝试提取图片...');
            const imageUrls = await scraper.extractImageUrls();
            console.log(`📸 提取到 ${imageUrls.length} 张图片`);
            
            if (imageUrls.length > 0) {
                console.log('📸 图片URL列表:');
                imageUrls.forEach((url, index) => {
                    console.log(`  ${index + 1}. ${url}`);
                });
                
                // 尝试下载图片
                console.log('\n⬇️ 尝试下载图片...');
                const result = await scraper.downloadImages(imageUrls, '海底捞', '北京朝阳区');
                console.log(`📊 下载结果: ${result.downloadedCount} 成功, ${result.failedCount} 失败`);
            } else {
                console.log('❌ 未提取到任何图片');
            }
        } else {
            console.log('❌ 页面没有找到任何内容');
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
improvedSearchTest().catch(console.error);
