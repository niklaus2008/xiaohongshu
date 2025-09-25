/**
 * 测试单个浏览器窗口修复效果
 * 验证不会创建重复的浏览器窗口
 */

const XiaohongshuScraper = require('./src/xiaohongshu-scraper');

async function testSingleBrowserWindow() {
    console.log('🧪 开始测试单个浏览器窗口修复效果...\n');
    
    try {
        // 创建多个爬虫实例
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
        
        // 测试1：同时初始化多个浏览器
        console.log('\n🔍 测试1：同时初始化多个浏览器');
        const initPromises = scrapers.map(async (scraper, index) => {
            console.log(`🚀 初始化爬虫实例 ${index + 1}...`);
            await scraper.initBrowser();
            console.log(`✅ 爬虫实例 ${index + 1} 初始化完成`);
        });
        
        await Promise.all(initPromises);
        console.log('✅ 所有爬虫实例初始化完成');
        
        // 测试2：检查浏览器实例数量
        console.log('\n🔍 测试2：检查浏览器实例数量');
        const browserCount = scrapers.filter(scraper => scraper.browser !== null).length;
        console.log(`📊 有效浏览器实例数量: ${browserCount}`);
        
        if (browserCount === 1) {
            console.log('✅ 成功：只有一个浏览器实例被创建');
        } else {
            console.log(`❌ 失败：创建了 ${browserCount} 个浏览器实例`);
        }
        
        // 测试3：测试重复初始化
        console.log('\n🔍 测试3：测试重复初始化');
        const firstScraper = scrapers[0];
        console.log('🔄 尝试重复初始化第一个爬虫实例...');
        await firstScraper.initBrowser();
        console.log('✅ 重复初始化完成（应该跳过）');
        
        // 测试4：测试页面跳转
        console.log('\n🔍 测试4：测试页面跳转');
        try {
            await firstScraper.page.goto('https://www.xiaohongshu.com/explore', {
                waitUntil: 'domcontentloaded',
                timeout: 10000
            });
            console.log('✅ 页面跳转成功');
        } catch (error) {
            console.log(`⚠️ 页面跳转失败: ${error.message}`);
        }
        
        // 测试5：测试登录状态一致性检查
        console.log('\n🔍 测试5：测试登录状态一致性检查');
        try {
            const loginInfo = {
                hasUserElements: false,
                hasUserMenu: false,
                hasLoginElements: true,
                hasLoginPrompt: true,
                isOnLoginPage: false,
                hasContent: true,
                hasSearchResults: true
            };
            
            const consistencyResult = await firstScraper.checkLoginConsistency(loginInfo, true);
            console.log('✅ 登录状态一致性检查完成');
            console.log(`📊 检查结果: ${JSON.stringify(consistencyResult)}`);
        } catch (error) {
            console.log(`⚠️ 登录状态一致性检查失败: ${error.message}`);
        }
        
        // 清理资源
        console.log('\n🧹 清理资源...');
        for (const scraper of scrapers) {
            try {
                if (scraper.browser) {
                    await scraper.browser.close();
                }
            } catch (error) {
                console.log(`⚠️ 清理浏览器实例时出错: ${error.message}`);
            }
        }
        
        console.log('\n✅ 测试完成！');
        console.log('💡 如果看到"只有一个浏览器实例被创建"，说明修复成功');
        console.log('💡 如果看到重复初始化被跳过，说明防重复机制工作正常');
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
    }
}

// 运行测试
testSingleBrowserWindow().catch(console.error);
