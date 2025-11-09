/**
 * 登录状态调试脚本
 * 用于检查当前Chromium浏览器窗口的登录状态
 */

const { chromium } = require('playwright');
const path = require('path');

async function debugLoginStatus() {
    console.log('🔍 开始检查登录状态...\n');
    
    try {
        // 找到browser-data目录中最新的用户数据目录
        const fs = require('fs');
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
        console.log(`📂 使用浏览器数据目录: ${latestUserDataDir}\n`);
        
        // 连接到现有的浏览器
        const context = await chromium.launchPersistentContext(latestUserDataDir, {
            headless: false,
            channel: undefined
        });
        
        const pages = context.pages();
        console.log(`📄 当前打开的页面数: ${pages.length}\n`);
        
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const url = page.url();
            console.log(`\n========== 页面 ${i + 1} ==========`);
            console.log(`URL: ${url}`);
            
            // 检查登录状态
            const loginInfo = await page.evaluate(() => {
                const bodyText = document.body ? document.body.innerText : '';
                const url = window.location.href;
                
                // 检查登录提示
                const hasLoginPrompt = bodyText.includes('登录后查看') || 
                                     bodyText.includes('扫码登录') ||
                                     bodyText.includes('手机号登录') ||
                                     bodyText.includes('请登录') ||
                                     bodyText.includes('登录查看') ||
                                     bodyText.includes('二维码登录');
                
                // 检查用户元素
                const userElements = document.querySelectorAll('.user-info, .user-avatar, .profile, [data-testid*="user"], .user-name, .user-menu');
                
                // 检查导航元素
                const hasNavElements = bodyText.includes('发现') && 
                                     bodyText.includes('发布') && 
                                     (bodyText.includes('通知') || bodyText.includes('消息'));
                
                return {
                    url: url,
                    hasLoginPrompt: hasLoginPrompt,
                    userElementsCount: userElements.length,
                    hasNavElements: hasNavElements,
                    bodyTextLength: bodyText.length,
                    bodyTextPreview: bodyText.substring(0, 200)
                };
            });
            
            console.log('登录状态检查:');
            console.log('  - 是否显示登录提示:', loginInfo.hasLoginPrompt ? '是' : '否');
            console.log('  - 用户元素数量:', loginInfo.userElementsCount);
            console.log('  - 是否有导航元素:', loginInfo.hasNavElements ? '是' : '否');
            console.log('  - 页面内容长度:', loginInfo.bodyTextLength);
            console.log('  - 页面内容预览:', loginInfo.bodyTextPreview);
            
            // 判断登录状态
            const isLoggedIn = !loginInfo.hasLoginPrompt && 
                             (loginInfo.userElementsCount > 0 || loginInfo.hasNavElements);
            
            console.log('\n📊 登录状态判定:', isLoggedIn ? '✅ 已登录' : '❌ 未登录');
            
            // 如果已登录，显示Cookie信息
            if (isLoggedIn) {
                const cookies = await context.cookies();
                console.log(`\n🍪 Cookie数量: ${cookies.length}`);
                console.log('🍪 重要Cookie:');
                const importantCookies = cookies.filter(c => 
                    c.name.includes('session') || 
                    c.name.includes('token') ||
                    c.name.includes('web_session')
                );
                importantCookies.forEach(c => {
                    console.log(`  - ${c.name}: ${c.value.substring(0, 20)}...`);
                });
            }
        }
        
        console.log('\n\n✅ 检查完成！');
        console.log('提示：如果显示"已登录"但任务没有继续，可能需要重启任务。');
        
        // 不关闭浏览器，让用户继续使用
        
    } catch (error) {
        console.error('❌ 检查失败:', error.message);
    }
}

debugLoginStatus();

