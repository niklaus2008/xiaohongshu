/**
 * Cookie有效期检查脚本
 */

const fs = require('fs-extra');

function checkCookieExpiry() {
    console.log('🍪 检查Cookie有效期...\n');
    
    try {
        const cookies = fs.readJsonSync('./cookies.json');
        const now = Date.now() / 1000; // 当前时间戳（秒）
        
        console.log(`📅 当前时间: ${new Date().toLocaleString()}`);
        console.log(`⏰ 当前时间戳: ${now}\n`);
        
        cookies.forEach((cookie, index) => {
            const expires = cookie.expires;
            const isExpired = expires > 0 && expires < now;
            const timeLeft = expires > 0 ? (expires - now) : '永不过期';
            const expiryDate = expires > 0 ? new Date(expires * 1000).toLocaleString() : '永不过期';
            
            console.log(`${index + 1}. ${cookie.name}:`);
            console.log(`   - 过期时间: ${expiryDate}`);
            console.log(`   - 剩余时间: ${typeof timeLeft === 'number' ? `${Math.floor(timeLeft / 3600)}小时` : timeLeft}`);
            console.log(`   - 状态: ${isExpired ? '❌ 已过期' : '✅ 有效'}`);
            console.log(`   - 域名: ${cookie.domain}`);
            console.log('');
        });
        
        // 统计有效和过期的Cookie
        const validCookies = cookies.filter(cookie => {
            const expires = cookie.expires;
            return expires <= 0 || expires >= now;
        });
        
        const expiredCookies = cookies.filter(cookie => {
            const expires = cookie.expires;
            return expires > 0 && expires < now;
        });
        
        console.log('📊 Cookie统计:');
        console.log(`   - 总Cookie数: ${cookies.length}`);
        console.log(`   - 有效Cookie: ${validCookies.length}`);
        console.log(`   - 过期Cookie: ${expiredCookies.length}`);
        
        if (expiredCookies.length > 0) {
            console.log('\n❌ 过期的Cookie:');
            expiredCookies.forEach(cookie => {
                console.log(`   - ${cookie.name} (过期时间: ${new Date(cookie.expires * 1000).toLocaleString()})`);
            });
        }
        
        // 检查关键的登录Cookie
        const loginCookies = ['web_session', 'a1', 'webId'];
        console.log('\n🔐 关键登录Cookie状态:');
        loginCookies.forEach(name => {
            const cookie = cookies.find(c => c.name === name);
            if (cookie) {
                const expires = cookie.expires;
                const isExpired = expires > 0 && expires < now;
                const expiryDate = expires > 0 ? new Date(expires * 1000).toLocaleString() : '永不过期';
                console.log(`   - ${name}: ${isExpired ? '❌ 已过期' : '✅ 有效'} (过期: ${expiryDate})`);
            } else {
                console.log(`   - ${name}: ❌ 不存在`);
            }
        });
        
    } catch (error) {
        console.error('❌ 检查Cookie时出错:', error.message);
    }
}

checkCookieExpiry();
