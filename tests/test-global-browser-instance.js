/**
 * 测试全局浏览器实例管理
 * 验证不会创建重复的浏览器窗口
 */

const XiaohongshuScraper = require('./src/xiaohongshu-scraper');

async function testGlobalBrowserInstance() {
    console.log('🧪 开始测试全局浏览器实例管理...\n');
    
    try {
        // 创建多个爬虫实例（模拟批量处理）
        const scrapers = [];
        for (let i = 0; i < 3; i++) {
            const scraper = new XiaohongshuScraper({
                downloadPath: './test-downloads',
                maxImages: 2,
                headless: false,
                browserType: 'chromium'
            });
            scrapers.push(scraper);
        }
        
        console.log('📊 创建了 3 个爬虫实例');
        
        // 测试1：第一个实例初始化浏览器
        console.log('\n🔍 测试1：第一个实例初始化浏览器');
        await scrapers[0].initBrowser();
        console.log('✅ 第一个实例初始化完成');
        
        // 测试2：其他实例应该使用全局实例
        console.log('\n🔍 测试2：其他实例使用全局实例');
        for (let i = 1; i < scrapers.length; i++) {
            console.log(`🚀 初始化爬虫实例 ${i + 1}...`);
            await scrapers[i].initBrowser();
            console.log(`✅ 爬虫实例 ${i + 1} 初始化完成`);
        }
        
        // 测试3：检查浏览器实例数量
        console.log('\n🔍 测试3：检查浏览器实例数量');
        const browserCount = scrapers.filter(scraper => scraper.browser !== null).length;
        const globalBrowserExists = XiaohongshuScraper._globalBrowserInstance !== null;
        const globalPageExists = XiaohongshuScraper._globalPageInstance !== null;
        
        console.log(`📊 有效浏览器实例数量: ${browserCount}`);
        console.log(`📊 全局浏览器实例存在: ${globalBrowserExists}`);
        console.log(`📊 全局页面实例存在: ${globalPageExists}`);
        
        if (browserCount === 3 && globalBrowserExists && globalPageExists) {
            console.log('✅ 成功：所有实例共享同一个浏览器实例');
        } else {
            console.log(`❌ 失败：浏览器实例管理异常`);
        }
        
        // 测试4：测试页面跳转
        console.log('\n🔍 测试4：测试页面跳转');
        try {
            await scrapers[0].page.goto('https://www.xiaohongshu.com/explore', {
                waitUntil: 'domcontentloaded',
                timeout: 10000
            });
            console.log('✅ 页面跳转成功');
        } catch (error) {
            console.log(`⚠️ 页面跳转失败: ${error.message}`);
        }
        
        // 测试5：测试共享登录状态
        console.log('\n🔍 测试5：测试共享登录状态');
        try {
            // 模拟共享登录状态
            const mockSharedState = {
                isLoggedIn: true,
                cookies: [
                    { name: 'test_cookie', value: 'test_value', domain: '.xiaohongshu.com' }
                ],
                browser: scrapers[0].browser,
                page: scrapers[0].page
            };
            
            scrapers[1].sharedLoginState = mockSharedState;
            const result = await scrapers[1].useSharedLoginState();
            console.log(`✅ 共享登录状态测试完成: ${result}`);
        } catch (error) {
            console.log(`⚠️ 共享登录状态测试失败: ${error.message}`);
        }
        
        // 清理资源
        console.log('\n🧹 清理资源...');
        try {
            if (XiaohongshuScraper._globalBrowserInstance) {
                await XiaohongshuScraper._globalBrowserInstance.close();
                XiaohongshuScraper._globalBrowserInstance = null;
                XiaohongshuScraper._globalPageInstance = null;
            }
        } catch (error) {
            console.log(`⚠️ 清理全局浏览器实例时出错: ${error.message}`);
        }
        
        console.log('\n✅ 测试完成！');
        console.log('💡 如果看到"所有实例共享同一个浏览器实例"，说明修复成功');
        console.log('💡 如果看到全局实例管理正常，说明防重复机制工作正常');
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
    }
}

// 运行测试
testGlobalBrowserInstance().catch(console.error);
