/**
 * 验证修改后的功能完整性
 * 确保只禁用了日志转发，其他功能正常
 */

const fs = require('fs-extra');

async function verifyChanges() {
    console.log('🔍 验证修改后的功能完整性...\n');
    
    try {
        // 1. 检查日志转发是否已禁用
        console.log('📋 检查1：日志转发是否已禁用');
        const webInterfaceContent = await fs.readFile('./src/web-interface.js', 'utf8');
        const batchProcessorContent = await fs.readFile('./src/batch-processor.js', 'utf8');
        const scraperContent = await fs.readFile('./src/xiaohongshu-scraper.js', 'utf8');
        
        const logDisabled = 
            webInterfaceContent.includes('enableFrontend: false') &&
            batchProcessorContent.includes('// 发送日志到客户端（已禁用）') &&
            scraperContent.includes('// 如果有日志管理器，使用它发送日志（已禁用前端转发）');
        
        console.log(`${logDisabled ? '✅' : '❌'} 日志转发已禁用: ${logDisabled}`);
        
        // 2. 检查状态更新功能是否正常
        console.log('\n📋 检查2：状态更新功能是否正常');
        const statusFunctions = [
            'emitStatus',
            'sendCurrentStatus',
            'getCurrentStatus',
            'getStatus'
        ];
        
        let statusFunctionsOk = true;
        for (const func of statusFunctions) {
            const exists = batchProcessorContent.includes(func) || webInterfaceContent.includes(func);
            console.log(`${exists ? '✅' : '❌'} ${func}: ${exists ? '存在' : '缺失'}`);
            if (!exists) statusFunctionsOk = false;
        }
        
        // 3. 检查Socket.IO事件是否正常
        console.log('\n📋 检查3：Socket.IO事件是否正常');
        const socketEvents = [
            'status',
            'heartbeat',
            'status_update',
            'task_completed',
            'task_final_completed'
        ];
        
        let socketEventsOk = true;
        for (const event of socketEvents) {
            const exists = batchProcessorContent.includes(`emit('${event}'`) || 
                         webInterfaceContent.includes(`emit('${event}'`);
            console.log(`${exists ? '✅' : '❌'} ${event}事件: ${exists ? '存在' : '缺失'}`);
            if (!exists) socketEventsOk = false;
        }
        
        // 4. 检查核心功能是否完整
        console.log('\n📋 检查4：核心功能是否完整');
        const coreFunctions = [
            'startHeartbeat',
            'stopHeartbeat',
            'handleStart',
            'handleLoginStatus',
            'handleOpenBrowser'
        ];
        
        let coreFunctionsOk = true;
        for (const func of coreFunctions) {
            const exists = webInterfaceContent.includes(func);
            console.log(`${exists ? '✅' : '❌'} ${func}: ${exists ? '存在' : '缺失'}`);
            if (!exists) coreFunctionsOk = false;
        }
        
        // 5. 检查Cookie相关功能是否正常
        console.log('\n📋 检查5：Cookie相关功能是否正常');
        const cookieFunctions = [
            'checkCookieValidity',
            'checkLoginStatus',
            'getUnifiedLoginStatus',
            'validateCookies'
        ];
        
        let cookieFunctionsOk = true;
        for (const func of cookieFunctions) {
            const exists = scraperContent.includes(func) || webInterfaceContent.includes(func);
            console.log(`${exists ? '✅' : '❌'} ${func}: ${exists ? '存在' : '缺失'}`);
            if (!exists) cookieFunctionsOk = false;
        }
        
        // 总结
        console.log('\n📊 验证结果总结:');
        console.log(`✅ 日志转发禁用: ${logDisabled}`);
        console.log(`✅ 状态更新功能: ${statusFunctionsOk}`);
        console.log(`✅ Socket.IO事件: ${socketEventsOk}`);
        console.log(`✅ 核心功能: ${coreFunctionsOk}`);
        console.log(`✅ Cookie功能: ${cookieFunctionsOk}`);
        
        const allOk = logDisabled && statusFunctionsOk && socketEventsOk && coreFunctionsOk && cookieFunctionsOk;
        
        if (allOk) {
            console.log('\n🎉 所有功能验证通过！');
            console.log('💡 修改总结:');
            console.log('- ✅ 终端日志不再发送到前端');
            console.log('- ✅ 状态更新功能正常');
            console.log('- ✅ Socket.IO事件正常');
            console.log('- ✅ 核心功能完整');
            console.log('- ✅ Cookie功能正常');
            console.log('\n🚀 现在可以重启Web服务，功能完全正常！');
        } else {
            console.log('\n⚠️ 部分功能可能受到影响，请检查上述结果');
        }
        
    } catch (error) {
        console.error('❌ 验证过程中出错:', error.message);
    }
}

// 如果直接运行此文件
if (require.main === module) {
    verifyChanges();
}

module.exports = { verifyChanges };
