/**
 * 手动保存Cookie脚本
 * 用于从当前运行的Chromium浏览器中提取Cookie并保存
 */

const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

async function manualSaveCookies() {
    console.log('🍪 开始手动保存Cookie...\n');
    
    try {
        // 连接到现有的Chromium浏览器（通过cdp端口）
        // 注意：这需要知道调试端口，Playwright默认使用的是pipe，不是端口
        
        // 替代方案：直接读取browser-data目录中的Cookie
        const browserDataDir = path.join(__dirname, 'browser-data');
        
        if (!fs.existsSync(browserDataDir)) {
            console.log('❌ browser-data目录不存在');
            return;
        }
        
        // 找到最新的用户数据目录
        const userDataDirs = fs.readdirSync(browserDataDir)
            .filter(dir => dir.startsWith('scraper_'))
            .map(dir => ({
                name: dir,
                path: path.join(browserDataDir, dir),
                time: fs.statSync(path.join(browserDataDir, dir)).mtime
            }))
            .sort((a, b) => b.time - a.time);
        
        if (userDataDirs.length === 0) {
            console.log('❌ 没有找到浏览器数据目录');
            return;
        }
        
        const latestUserDataDir = userDataDirs[0].path;
        console.log(`📂 浏览器数据目录: ${latestUserDataDir}`);
        
        // 查找Cookies文件
        const cookiesPath = path.join(latestUserDataDir, 'Default', 'Cookies');
        const networkPath = path.join(latestUserDataDir, 'Default', 'Network', 'Cookies');
        
        console.log('\n尝试查找Cookie文件...');
        console.log(`  路径1: ${cookiesPath}`);
        console.log(`  路径2: ${networkPath}`);
        
        if (fs.existsSync(cookiesPath)) {
            console.log('\n✅ 找到Cookie数据库文件！');
            console.log('注意：Cookie存储在SQLite数据库中，需要使用专门的工具提取。');
            console.log('\n建议：重新开始任务，让程序自动提取Cookie。');
        } else if (fs.existsSync(networkPath)) {
            console.log('\n✅ 找到Cookie数据库文件（备用路径）！');
            console.log('注意：Cookie存储在SQLite数据库中，需要使用专门的工具提取。');
            console.log('\n建议：重新开始任务，让程序自动提取Cookie。');
        } else {
            console.log('\n❌ 未找到Cookie文件');
        }
        
        console.log('\n\n📝 解决方案：');
        console.log('1. 在Web界面点击"停止下载"');
        console.log('2. 关闭所有Chromium浏览器窗口');
        console.log('3. 重新点击"开始下载"');
        console.log('4. 重新扫码登录');
        console.log('5. 这次应该能正确检测到登录状态并保存Cookie');
        
    } catch (error) {
        console.error('❌ 操作失败:', error.message);
    }
}

manualSaveCookies();

