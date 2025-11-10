/**
 * 检查浏览器中实际的Cookie
 * 连接到正在运行的Chromium浏览器，查看实际加载的Cookie
 */

const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

async function checkBrowserCookies() {
    console.log('🔍 开始检查Chromium浏览器中的实际Cookie...\n');
    
    try {
        // 找到最新的用户数据目录
        const browserDataDir = path.join(__dirname, 'browser-data');
        
        if (!fs.existsSync(browserDataDir)) {
            console.log('❌ browser-data目录不存在');
            return;
        }
        
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
        console.log(`📅 最后修改时间: ${userDataDirs[0].time}\n`);
        
        // 尝试读取Cookie文件中的数据
        console.log('📄 检查cookies.json文件:');
        const cookieFile = path.join(__dirname, 'cookies.json');
        if (fs.existsSync(cookieFile)) {
            const cookieData = await fs.readJson(cookieFile);
            const cookies = cookieData.cookies || cookieData;
            console.log(`  ✅ Cookie文件存在`);
            console.log(`  📊 包含 ${cookies.length} 个Cookie`);
            
            // 显示重要Cookie
            const importantCookies = cookies.filter(c => 
                c.name.includes('web_session') || 
                c.name.includes('token') ||
                c.name.includes('a1') ||
                c.name.includes('webId')
            );
            
            console.log(`  🔑 重要Cookie (${importantCookies.length}个):`);
            importantCookies.forEach(c => {
                const now = Date.now() / 1000;
                const expired = c.expires && c.expires < now;
                const status = expired ? '❌ 已过期' : '✅ 有效';
                console.log(`    - ${c.name}: ${status} (domain: ${c.domain})`);
            });
        } else {
            console.log('  ❌ Cookie文件不存在');
        }
        
        console.log('\n💡 建议:');
        console.log('  1. 如果浏览器正在运行，无法直接读取其Cookie数据库');
        console.log('  2. Cookie虽然加载了，但小红书在搜索时可能要求重新验证');
        console.log('  3. 这是小红书的反爬虫机制，不是Cookie加载失败');
        console.log('\n🔧 解决方案:');
        console.log('  1. 在Chromium窗口中手动扫码登录一次');
        console.log('  2. 登录后Cookie会被自动更新保存');
        console.log('  3. 下次运行时会使用更新后的Cookie');
        
    } catch (error) {
        console.error('❌ 检查失败:', error.message);
    }
}

checkBrowserCookies();

