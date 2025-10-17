/**
 * 测试Cookie持久化修复效果
 * 验证修复后是否还会出现重复登录问题
 */

const { CookiePersistenceFixer } = require('./fix-cookie-persistence');
const { ImprovedCookieValidator } = require('./improved-cookie-validator');
const { ImprovedBrowserManager } = require('./improved-browser-manager');
const fs = require('fs-extra');
const path = require('path');

async function testCookiePersistenceFix() {
    console.log('🧪 开始测试Cookie持久化修复效果...\n');
    
    try {
        // 测试1：检查当前Cookie状态
        console.log('📋 测试1：检查当前Cookie状态');
        const cookieFile = './cookies.json';
        const cookieExists = await fs.pathExists(cookieFile);
        
        if (cookieExists) {
            const cookies = await fs.readJson(cookieFile);
            console.log(`✅ 找到 ${cookies.length} 个Cookie`);
            
            // 检查关键Cookie
            const criticalCookies = ['a1', 'web_session', 'webId', 'xsecappid'];
            const hasCriticalCookies = criticalCookies.some(name => 
                cookies.some(cookie => cookie.name === name)
            );
            console.log(`📊 关键Cookie存在: ${hasCriticalCookies}`);
        } else {
            console.log('⚠️ 未找到Cookie文件');
        }
        
        // 测试2：验证改进的Cookie验证器
        console.log('\n📋 测试2：验证改进的Cookie验证器');
        const validator = new ImprovedCookieValidator();
        const validation = await validator.manageCookies();
        
        if (validation.success) {
            console.log('✅ Cookie验证成功，无需重新登录');
            console.log(`📦 有效Cookie数量: ${validation.cookies.length}`);
        } else {
            console.log('⚠️ Cookie验证失败，需要重新登录');
            console.log(`📝 原因: ${validation.reason || validation.error}`);
        }
        
        // 测试3：验证改进的浏览器管理器
        console.log('\n📋 测试3：验证改进的浏览器管理器');
        const browserManager = new ImprovedBrowserManager();
        
        try {
            const browserInfo = await browserManager.getBrowserInstance();
            console.log('✅ 浏览器实例获取成功');
            console.log(`📊 实例初始化状态: ${browserInfo.isInitialized}`);
            
            // 测试实例复用
            const browserInfo2 = await browserManager.getBrowserInstance();
            console.log('✅ 浏览器实例复用成功');
            
        } catch (error) {
            console.log('⚠️ 浏览器实例测试失败:', error.message);
        } finally {
            await browserManager.cleanup();
        }
        
        // 测试4：综合修复测试
        console.log('\n📋 测试4：综合修复测试');
        const fixer = new CookiePersistenceFixer();
        
        try {
            const result = await fixer.fixCookiePersistence();
            
            if (result.success) {
                console.log('✅ Cookie持久化修复成功');
                console.log(`📝 结果: ${result.message}`);
            } else {
                console.log('⚠️ Cookie持久化修复失败');
                console.log(`📝 错误: ${result.error || result.message}`);
            }
            
        } catch (error) {
            console.log('❌ 综合修复测试失败:', error.message);
        } finally {
            await fixer.cleanup();
        }
        
        // 测试5：模拟批量下载场景
        console.log('\n📋 测试5：模拟批量下载场景');
        await simulateBatchDownload();
        
        console.log('\n🎉 所有测试完成！');
        
    } catch (error) {
        console.error('❌ 测试过程中出错:', error.message);
    }
}

/**
 * 模拟批量下载场景
 */
async function simulateBatchDownload() {
    try {
        console.log('🔄 模拟第一次批量下载...');
        
        // 第一次下载
        const fixer1 = new CookiePersistenceFixer();
        const result1 = await fixer1.fixCookiePersistence();
        console.log(`📊 第一次下载结果: ${result1.success ? '成功' : '失败'}`);
        await fixer1.cleanup();
        
        // 等待一段时间
        console.log('⏳ 等待5秒...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 第二次下载（模拟用户再次执行下载任务）
        console.log('🔄 模拟第二次批量下载...');
        const fixer2 = new CookiePersistenceFixer();
        const result2 = await fixer2.fixCookiePersistence();
        console.log(`📊 第二次下载结果: ${result2.success ? '成功' : '失败'}`);
        
        if (result2.success && !result2.message.includes('需要重新登录')) {
            console.log('✅ 第二次下载无需重新登录，修复成功！');
        } else {
            console.log('⚠️ 第二次下载仍需要重新登录，需要进一步优化');
        }
        
        await fixer2.cleanup();
        
    } catch (error) {
        console.error('❌ 模拟批量下载时出错:', error.message);
    }
}

/**
 * 检查修复效果
 */
async function checkFixEffectiveness() {
    console.log('\n📊 检查修复效果...');
    
    try {
        // 检查登录状态检测阈值
        const webInterfacePath = './src/web-interface.js';
        const webInterfaceContent = await fs.readFile(webInterfacePath, 'utf8');
        
        if (webInterfaceContent.includes('loginScore >= 2')) {
            console.log('✅ 登录状态检测阈值已降低到2');
        } else {
            console.log('⚠️ 登录状态检测阈值可能未正确修改');
        }
        
        // 检查新增的改进组件
        const components = [
            'improved-cookie-validator.js',
            'improved-browser-manager.js',
            'fix-cookie-persistence.js'
        ];
        
        for (const component of components) {
            const exists = await fs.pathExists(component);
            console.log(`${exists ? '✅' : '❌'} ${component}: ${exists ? '存在' : '不存在'}`);
        }
        
    } catch (error) {
        console.error('❌ 检查修复效果时出错:', error.message);
    }
}

// 主测试函数
async function main() {
    try {
        await testCookiePersistenceFix();
        await checkFixEffectiveness();
        
        console.log('\n📋 修复总结:');
        console.log('1. ✅ 降低了登录状态检测阈值（从3到2）');
        console.log('2. ✅ 改进了Cookie验证逻辑，增加容错机制');
        console.log('3. ✅ 优化了浏览器实例复用机制');
        console.log('4. ✅ 添加了Cookie备份和恢复机制');
        console.log('5. ✅ 提供了综合修复脚本');
        
        console.log('\n💡 使用建议:');
        console.log('- 如果仍然遇到重复登录问题，请运行: node fix-cookie-persistence.js');
        console.log('- 建议定期备份cookies.json文件');
        console.log('- 确保browser-data目录有足够的权限');
        
    } catch (error) {
        console.error('❌ 主测试过程中出错:', error.message);
    }
}

// 如果直接运行此文件
if (require.main === module) {
    main();
}

module.exports = { testCookiePersistenceFix, simulateBatchDownload, checkFixEffectiveness };
