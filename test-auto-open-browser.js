/**
 * 测试自动打开浏览器功能
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const { WebInterface } = require('./src/web-interface');

async function testAutoOpenBrowser() {
    console.log('🧪 开始测试自动打开浏览器功能...');
    
    try {
        // 创建WebInterface实例，启用自动打开浏览器
        const webInterface = new WebInterface({
            port: 3001, // 使用不同端口避免冲突
            autoOpenBrowser: true
        });
        
        console.log('✅ WebInterface实例创建成功');
        console.log('🌐 配置信息:');
        console.log(`   - 端口: ${webInterface.port}`);
        console.log(`   - 主机: ${webInterface.host}`);
        console.log(`   - 自动打开浏览器: ${webInterface.autoOpenBrowser}`);
        console.log('🔧 将使用Chromium浏览器打开Web界面');
        
        // 启动服务器
        console.log('🚀 正在启动服务器...');
        await webInterface.start();
        
        console.log('✅ 服务器启动成功，应该会自动打开浏览器');
        console.log('📱 访问地址: http://localhost:3001');
        console.log('⏹️  按 Ctrl+C 停止测试');
        
        // 保持服务器运行
        process.on('SIGINT', async () => {
            console.log('\n🛑 正在停止测试...');
            await webInterface.stop();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
        process.exit(1);
    }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
    testAutoOpenBrowser();
}

module.exports = { testAutoOpenBrowser };
