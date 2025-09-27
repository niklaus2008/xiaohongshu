#!/usr/bin/env node

/**
 * 测试重写后的登录逻辑
 * 验证Cookie优先，失败则扫码登录的新逻辑
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

async function testRewrittenLogin() {
    console.log('🧪 测试重写后的登录逻辑...');
    console.log('📋 测试场景：');
    console.log('   1. 如果Cookie可用，就用Cookie登录');
    console.log('   2. 如果Cookie不可用，就用户扫码登录');
    console.log('');
    
    try {
        // 创建爬虫实例，配置为使用独立浏览器
        const scraper = new XiaohongshuScraper({
            downloadPath: './test-downloads',
            maxImages: 3,
            headless: false, // 显示浏览器窗口
            delay: 2000,
            timeout: 30000,
            tryRemoveWatermark: true,
            enableImageProcessing: true,
            browserType: 'chromium', // 使用独立浏览器
            login: {
                method: 'manual', // 手动登录（扫码）
                autoLogin: true,   // 启用自动登录
                saveCookies: true, // 保存Cookie
                cookieFile: './test-cookies.json'
            }
        });
        
        console.log('🔧 初始化浏览器...');
        await scraper.initBrowser();
        
        console.log('🔐 开始测试新的登录逻辑...');
        console.log('📝 预期行为：');
        console.log('   - 首先尝试使用已保存的Cookie（如果存在）');
        console.log('   - 如果Cookie不可用，会打开独立浏览器让您扫码登录');
        console.log('   - 登录成功后会自动保存Cookie，下次使用');
        console.log('');
        
        // 测试新的登录逻辑
        const loginSuccess = await scraper.autoLogin();
        
        if (loginSuccess) {
            console.log('✅ 登录测试成功！');
            console.log('🎉 新的登录逻辑工作正常');
            
            // 测试搜索功能
            console.log('🔍 测试搜索功能...');
            const result = await scraper.searchAndDownload('星巴克', '上海');
            
            if (result.success) {
                console.log(`✅ 搜索测试成功，下载了 ${result.downloadedCount} 张图片`);
            } else {
                console.log('❌ 搜索测试失败:', result.error);
            }
            
        } else {
            console.log('❌ 登录测试失败');
        }
        
        // 关闭浏览器
        console.log('🔒 关闭浏览器...');
        await scraper.close();
        
        console.log('🏁 测试完成');
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
        console.error('📊 错误详情:', error);
    }
}

// 运行测试
if (require.main === module) {
    testRewrittenLogin().catch(console.error);
}

module.exports = { testRewrittenLogin };
