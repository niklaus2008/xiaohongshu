/**
 * 测试用户数据目录配置
 * 验证浏览器是否能正确持久化Cookie和缓存
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs-extra');

async function testUserDataDir() {
    console.log('🧪 测试用户数据目录配置...\n');
    
    // 设置用户数据目录
    const userDataDir = path.join(process.cwd(), 'browser-data');
    console.log(`📁 用户数据目录: ${userDataDir}`);
    
    // 确保目录存在
    await fs.ensureDir(userDataDir);
    console.log('✅ 用户数据目录已创建');
    
    try {
        // 第一次启动浏览器
        console.log('\n🚀 第一次启动浏览器...');
        const context1 = await chromium.launchPersistentContext(userDataDir, {
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
        
        const page1 = await context1.newPage();
        
        // 访问小红书并设置一些Cookie
        console.log('🌐 访问小红书首页...');
        await page1.goto('https://www.xiaohongshu.com/explore', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        // 设置一个测试Cookie
        await page1.context().addCookies([{
            name: 'test-cookie',
            value: 'test-value-' + Date.now(),
            domain: '.xiaohongshu.com',
            path: '/',
            expires: Date.now() / 1000 + 3600 // 1小时后过期
        }]);
        
        console.log('✅ 已设置测试Cookie');
        
        // 获取当前Cookie
        const cookies1 = await page1.context().cookies();
        console.log(`📊 当前Cookie数量: ${cookies1.length}`);
        
        // 关闭浏览器
        await context1.close();
        console.log('🔒 浏览器已关闭');
        
        // 等待2秒
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 第二次启动浏览器（使用相同的数据目录）
        console.log('\n🚀 第二次启动浏览器（使用相同数据目录）...');
        const context2 = await chromium.launchPersistentContext(userDataDir, {
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
        
        const page2 = await context2.newPage();
        
        // 访问小红书
        console.log('🌐 再次访问小红书首页...');
        await page2.goto('https://www.xiaohongshu.com/explore', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        // 检查Cookie是否持久化
        const cookies2 = await page2.context().cookies();
        console.log(`📊 新会话Cookie数量: ${cookies2.length}`);
        
        // 查找测试Cookie
        const testCookie = cookies2.find(cookie => cookie.name === 'test-cookie');
        if (testCookie) {
            console.log('✅ 测试Cookie已持久化！');
            console.log(`🍪 Cookie值: ${testCookie.value}`);
        } else {
            console.log('❌ 测试Cookie未找到，持久化失败');
        }
        
        // 检查是否有小红书相关的Cookie
        const xhsCookies = cookies2.filter(cookie => 
            cookie.domain.includes('xiaohongshu.com')
        );
        console.log(`📊 小红书相关Cookie数量: ${xhsCookies.length}`);
        
        if (xhsCookies.length > 0) {
            console.log('✅ 发现小红书相关Cookie，持久化成功！');
        }
        
        // 关闭浏览器
        await context2.close();
        console.log('🔒 浏览器已关闭');
        
        console.log('\n🎉 测试完成！');
        console.log('💡 如果看到"测试Cookie已持久化"，说明用户数据目录配置成功');
        console.log('💡 这样就不会每次都要重新登录了');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

// 运行测试
testUserDataDir().catch(console.error);
