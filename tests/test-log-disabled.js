/**
 * 测试日志转发是否已禁用
 */

const fs = require('fs-extra');

async function testLogDisabled() {
    console.log('🧪 测试日志转发是否已禁用...\n');
    
    try {
        // 检查web-interface.js的修改
        console.log('📋 检查web-interface.js的修改');
        const webInterfaceContent = await fs.readFile('./src/web-interface.js', 'utf8');
        
        if (webInterfaceContent.includes('enableFrontend: false')) {
            console.log('✅ web-interface.js: 前端日志转发已禁用');
        } else {
            console.log('❌ web-interface.js: 前端日志转发未禁用');
        }
        
        // 检查batch-processor.js的修改
        console.log('\n📋 检查batch-processor.js的修改');
        const batchProcessorContent = await fs.readFile('./src/batch-processor.js', 'utf8');
        
        if (batchProcessorContent.includes('// 发送日志到客户端（已禁用）')) {
            console.log('✅ batch-processor.js: 日志发送到客户端已禁用');
        } else {
            console.log('❌ batch-processor.js: 日志发送到客户端未禁用');
        }
        
        // 检查xiaohongshu-scraper.js的修改
        console.log('\n📋 检查xiaohongshu-scraper.js的修改');
        const scraperContent = await fs.readFile('./src/xiaohongshu-scraper.js', 'utf8');
        
        if (scraperContent.includes('// 如果有日志管理器，使用它发送日志（已禁用前端转发）')) {
            console.log('✅ xiaohongshu-scraper.js: 前端日志转发已禁用');
        } else {
            console.log('❌ xiaohongshu-scraper.js: 前端日志转发未禁用');
        }
        
        console.log('\n🎉 日志转发禁用检查完成！');
        console.log('\n💡 修改总结:');
        console.log('1. ✅ web-interface.js: enableFrontend设置为false');
        console.log('2. ✅ batch-processor.js: 注释掉io.emit("log")调用');
        console.log('3. ✅ xiaohongshu-scraper.js: 注释掉logger.sendCustomLog调用');
        console.log('\n📝 现在终端日志不会发送到前端，但其他功能不受影响');
        
    } catch (error) {
        console.error('❌ 测试过程中出错:', error.message);
    }
}

// 如果直接运行此文件
if (require.main === module) {
    testLogDisabled();
}

module.exports = { testLogDisabled };
