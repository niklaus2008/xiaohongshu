/**
 * 刷新Cookie获取脚本
 * 在浏览器中手动登录后运行此脚本获取新的Cookie
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

async function refreshCookies() {
    console.log('🔄 开始刷新Cookie...\n');
    
    const scraper = new XiaohongshuScraper({
        downloadPath: '/Users/liuqiang/code/toolkit/xiaohongshu/temp-downloads',
        maxImages: 1,
        headless: false, // 显示浏览器窗口
        login: {
            method: 'manual',
            autoLogin: false, // 不使用自动登录
            saveCookies: true,
            cookieFile: '/Users/liuqiang/code/toolkit/xiaohongshu/cookies.json'
        }
    });

    try {
        console.log('🔧 初始化浏览器...');
        await scraper.initBrowser();
        console.log('✅ 浏览器初始化完成\n');

        console.log('🌐 访问小红书首页...');
        await scraper.page.goto('https://www.xiaohongshu.com/explore', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        await scraper.page.waitForTimeout(3000);

        console.log('🔐 请在浏览器中手动完成登录...');
        console.log('💡 登录完成后，程序会自动检测登录状态并保存Cookie');
        
        // 等待用户手动登录
        let loginSuccess = false;
        let attempts = 0;
        const maxAttempts = 60; // 最多等待5分钟
        
        while (!loginSuccess && attempts < maxAttempts) {
            await scraper.page.waitForTimeout(5000);
            attempts++;
            
            console.log(`🔍 检查登录状态... (${attempts}/${maxAttempts})`);
            
            const isLoggedIn = await scraper.checkLoginStatus();
            if (isLoggedIn) {
                console.log('✅ 检测到登录成功！');
                loginSuccess = true;
                
                // 保存Cookie
                await scraper.saveCookies();
                console.log('💾 Cookie已保存');
                
                // 测试搜索功能
                console.log('\n🔍 测试搜索功能...');
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
                        hasContent: document.querySelectorAll('.note-item, .feed-item, .content-item, .note-card, .search-item, .result-item, article, .card').length,
                        bodyText: document.body ? document.body.innerText.substring(0, 500) : ''
                    };
                });
                
                console.log('📄 搜索页面信息:', searchInfo);
                
                if (searchInfo.hasContent > 0) {
                    console.log('✅ 搜索功能正常，Cookie有效！');
                } else {
                    console.log('⚠️ 搜索页面仍无内容，可能需要等待更长时间或重新登录');
                }
                
                break;
            } else {
                console.log('⏳ 等待登录中...');
            }
        }
        
        if (!loginSuccess) {
            console.log('⏰ 等待登录超时，请重新运行脚本');
        }

    } catch (error) {
        console.error('❌ 刷新Cookie过程中发生错误:', error.message);
    } finally {
        console.log('\n🔚 关闭浏览器...');
        await scraper.close();
        console.log('✅ 刷新完成');
    }
}

// 运行刷新
refreshCookies().catch(console.error);
