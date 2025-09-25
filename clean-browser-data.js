/**
 * 清理浏览器数据目录脚本
 * 用于解决用户数据目录冲突问题
 */

const fs = require('fs-extra');
const path = require('path');

async function cleanBrowserData() {
    console.log('🧹 开始清理浏览器数据目录...');
    
    const userDataDir = path.join(process.cwd(), 'browser-data');
    
    try {
        // 检查目录是否存在
        if (await fs.pathExists(userDataDir)) {
            console.log(`📁 找到用户数据目录: ${userDataDir}`);
            
            // 删除目录
            await fs.remove(userDataDir);
            console.log('✅ 已清理用户数据目录');
        } else {
            console.log('ℹ️ 用户数据目录不存在，无需清理');
        }
        
        console.log('🎉 清理完成！现在可以重新启动服务了');
        
    } catch (error) {
        console.error('❌ 清理失败:', error.message);
        console.log('💡 请手动删除 browser-data 目录');
    }
}

// 运行清理
cleanBrowserData().catch(console.error);
