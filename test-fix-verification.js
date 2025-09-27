#!/usr/bin/env node

/**
 * 测试修复验证脚本
 * 用于验证弹窗遮罩处理和登录状态修复是否有效
 */

const XiaohongshuScraper = require('./src/xiaohongshu-scraper');

async function testFixVerification() {
    console.log('🧪 开始测试修复验证...');
    
    try {
        // 创建爬虫实例
        const scraper = new XiaohongshuScraper({
            headless: false,
            autoLogin: true
        });
        
        console.log('✅ 爬虫实例创建成功');
        
        // 测试弹窗遮罩处理
        console.log('🔍 测试弹窗遮罩处理...');
        await scraper.initBrowser();
        
        // 导航到小红书页面
        await scraper.page.goto('https://www.xiaohongshu.com/explore', {
            waitUntil: 'domcontentloaded',
            timeout: 15000
        });
        
        console.log('✅ 页面导航成功');
        
        // 测试遮罩处理
        await scraper.handlePageOverlays();
        console.log('✅ 遮罩处理测试完成');
        
        // 测试登录状态验证
        console.log('🔍 测试登录状态验证...');
        const loginStatus = await scraper.checkLoginStatus();
        console.log('✅ 登录状态验证完成:', loginStatus);
        
        // 测试搜索功能
        console.log('🔍 测试搜索功能...');
        try {
            const result = await scraper.searchRestaurant('测试餐厅', '北京');
            console.log('✅ 搜索功能测试完成:', result);
        } catch (error) {
            console.log('⚠️ 搜索功能测试出错:', error.message);
        }
        
        // 清理资源
        await scraper.close();
        console.log('✅ 资源清理完成');
        
        console.log('🎉 修复验证测试完成！');
        
    } catch (error) {
        console.error('❌ 测试过程中出错:', error.message);
        console.error('错误堆栈:', error.stack);
    }
}

// 运行测试
if (require.main === module) {
    testFixVerification().then(() => {
        console.log('✅ 测试脚本执行完成');
        process.exit(0);
    }).catch(error => {
        console.error('❌ 测试脚本执行失败:', error.message);
        process.exit(1);
    });
}

module.exports = { testFixVerification };
