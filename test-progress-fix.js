/**
 * 测试进度状态修复功能
 * 用于验证餐馆进度状态更新和心跳检测停止问题
 */

const fetch = require('node-fetch');

async function testProgressFix() {
    const baseUrl = 'http://localhost:3000';
    
    try {
        console.log('🧪 开始测试进度状态修复功能...');
        
        // 1. 检查当前状态
        console.log('📊 检查当前状态...');
        const statusResponse = await fetch(`${baseUrl}/api/status`);
        const statusData = await statusResponse.json();
        
        if (statusData.success) {
            console.log('✅ 状态检查成功');
            console.log('📈 心跳检测状态:', statusData.data.heartbeat);
            console.log('📊 任务状态:', {
                isRunning: statusData.data.isRunning,
                progress: statusData.data.progress,
                completedRestaurants: statusData.data.completedRestaurants,
                totalRestaurants: statusData.data.totalRestaurants
            });
        } else {
            console.log('❌ 状态检查失败:', statusData.error);
        }
        
        // 2. 如果心跳检测还在运行，手动停止
        if (statusData.data.heartbeat.isActive) {
            console.log('🛑 心跳检测还在运行，手动停止...');
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
        } else {
            console.log('✅ 心跳检测已停止');
        }
        
        // 3. 最终状态检查
        console.log('📊 最终状态检查...');
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
    testProgressFix();
}

module.exports = { testProgressFix };
