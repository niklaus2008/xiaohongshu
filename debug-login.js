/**
 * 登录问题诊断脚本
 * 用于检查小红书登录状态和页面结构
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

async function debugLogin() {
    console.log('🔍 开始诊断登录问题...\n');
    
    const scraper = new XiaohongshuScraper({
        downloadPath: './debug-downloads',
        maxImages: 1,
        headless: false, // 显示浏览器窗口
        delay: 1000,
        login: {
            method: 'manual',
            autoLogin: true,
            saveCookies: true,
            cookieFile: './cookies.json'
        }
    });

    try {
        // 初始化浏览器
        await scraper.initBrowser();
        
        // 访问小红书首页
        console.log('🌐 访问小红书首页...');
        await scraper.page.goto('https://www.xiaohongshu.com/explore', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        await scraper.page.waitForTimeout(3000);
        
        // 检查页面信息
        const pageInfo = await scraper.page.evaluate(() => {
            return {
                url: window.location.href,
                title: document.title,
                bodyText: document.body ? document.body.innerText.substring(0, 1000) : '',
                hasLoginButton: document.body.innerText.includes('登录'),
                hasQrCode: !!document.querySelector('img[alt*="二维码"], .qr-code, canvas'),
                loginElements: Array.from(document.querySelectorAll('*')).filter(el => 
                    el.textContent && el.textContent.includes('登录')
                ).map(el => el.textContent.trim()).slice(0, 5),
                allImages: Array.from(document.querySelectorAll('img')).map(img => ({
                    src: img.src,
                    alt: img.alt,
                    width: img.width,
                    height: img.height
                })).slice(0, 10)
            };
        });
        
        console.log('📄 页面信息:', JSON.stringify(pageInfo, null, 2));
        
        // 检查登录状态
        const loginStatus = await scraper.checkLoginStatus();
        console.log(`🔐 登录状态: ${loginStatus ? '已登录' : '未登录'}`);
        
        // 如果未登录，尝试点击登录按钮
        if (!loginStatus) {
            console.log('🔍 尝试点击登录按钮...');
            try {
                const loginButton = await scraper.page.waitForSelector('text=登录', { timeout: 5000 });
                await loginButton.click();
                console.log('✅ 点击登录按钮成功');
                await scraper.page.waitForTimeout(3000);
                
                // 再次检查页面信息
                const afterClickInfo = await scraper.page.evaluate(() => {
                    return {
                        url: window.location.href,
                        title: document.title,
                        hasQrCode: !!document.querySelector('img[alt*="二维码"], .qr-code, canvas'),
                        qrCodeImages: Array.from(document.querySelectorAll('img')).filter(img => 
                            img.src.includes('qr') || img.alt.includes('二维码') || img.alt.includes('QR')
                        ).map(img => ({
                            src: img.src,
                            alt: img.alt,
                            width: img.width,
                            height: img.height
                        })),
                        allVisibleImages: Array.from(document.querySelectorAll('img')).map(img => ({
                            src: img.src,
                            alt: img.alt,
                            visible: img.offsetWidth > 0 && img.offsetHeight > 0
                        })).filter(img => img.visible).slice(0, 10)
                    };
                });
                
                console.log('📄 点击登录后的页面信息:', JSON.stringify(afterClickInfo, null, 2));
                
            } catch (error) {
                console.log('❌ 点击登录按钮失败:', error.message);
            }
        }
        
        // 等待用户观察
        console.log('\n⏳ 等待30秒供观察页面...');
        await scraper.page.waitForTimeout(30000);
        
    } catch (error) {
        console.error('❌ 诊断过程中发生错误:', error.message);
    } finally {
        await scraper.close();
    }
}

// 运行诊断
debugLogin().catch(error => {
    console.error('❌ 诊断脚本执行失败:', error);
    process.exit(1);
});
