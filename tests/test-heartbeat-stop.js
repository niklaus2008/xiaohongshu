/**
 * 测试心跳检测停止功能
 * 用于验证前端日志停止问题是否已修复
 */

const fetch = require('node-fetch');

async function testHeartbeatStop() {
    const baseUrl = 'http://localhost:3000';
    
    try {
        console.log('🧪 开始测试心跳检测停止功能...');
        
        // 1. 检查当前状态
        console.log('📊 检查当前状态...');
        const statusResponse = await fetch(`${baseUrl}/api/status`);
        const statusData = await statusResponse.json();
        
        if (statusData.success) {
            console.log('✅ 状态检查成功');
            console.log('📈 心跳检测状态:', statusData.data.heartbeat);
        } else {
            console.log('❌ 状态检查失败:', statusData.error);
        }
        
        // 2. 手动停止心跳检测
        console.log('🛑 手动停止心跳检测...');
        const stopResponse = await fetch(`${baseUrl}/api/stop-heartbeat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const stopData = await stopResponse.json();
        
        if (stopData.success) {
            console.log('✅ 心跳检测已停止:', stopData.message);
        } else {
            console.log('❌ 停止心跳检测失败:', stopData.error);
        }
        
        // 3. 再次检查状态
        console.log('📊 再次检查状态...');
        const finalStatusResponse = await fetch(`${baseUrl}/api/status`);
        const finalStatusData = await finalStatusResponse.json();
        
        if (finalStatusData.success) {
            console.log('✅ 最终状态检查成功');
            console.log('📈 心跳检测状态:', finalStatusData.data.heartbeat);
            
            if (!finalStatusData.data.heartbeat.isActive) {
                console.log('🎉 心跳检测已成功停止！');
            } else {
                console.log('⚠️ 心跳检测仍在运行');
            }
        } else {
            console.log('❌ 最终状态检查失败:', finalStatusData.error);
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

// 运行测试
if (require.main === module) {
    testHeartbeatStop();
}

module.exports = { testHeartbeatStop };
