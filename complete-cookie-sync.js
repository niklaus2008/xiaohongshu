// 完整Cookie同步脚本 - 在小红书页面中运行
console.log('🔍 开始完整同步小红书Cookie...');

// 检查是否在小红书页面
if (!window.location.hostname.includes('xiaohongshu.com')) {
    console.error('❌ 请在小红书页面中运行此脚本');
    alert('❌ 请在小红书页面中运行此脚本');
} else {
    // 获取所有Cookie，包括更详细的属性
    const cookies = document.cookie.split(';').map(cookie => {
        const [name, value] = cookie.trim().split('=');
        return {
            name: name,
            value: value,
            domain: window.location.hostname,
            path: '/',
            expires: Date.now() / 1000 + 30 * 24 * 60 * 60,
            httpOnly: false,
            secure: window.location.protocol === 'https:',
            sameSite: 'Lax'
        };
    }).filter(cookie => cookie.name && cookie.value);

    if (cookies.length === 0) {
        console.log('❌ 未找到Cookie，请确保已登录小红书');
        alert('❌ 未找到Cookie，请确保已登录小红书');
    } else {
        console.log(`📋 找到 ${cookies.length} 个Cookie，正在同步...`);
        
        // 检查关键Cookie
        const keyCookies = ['web_session', 'sessionid', 'user_id', 'token'];
        const foundKeyCookies = cookies.filter(cookie => 
            keyCookies.some(key => cookie.name.includes(key))
        );
        
        console.log(`🔑 关键Cookie: ${foundKeyCookies.map(c => c.name).join(', ')}`);
        
        if (foundKeyCookies.length === 0) {
            console.warn('⚠️ 未找到关键Cookie，可能需要重新登录');
        }
        
        // 使用简单的check端点同步Cookie
        fetch('http://localhost:3000/api/login/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cookies })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                console.log('✅ Cookie同步成功！登录状态已保存到下载工具');
                alert(`✅ Cookie同步成功！\\n\\n已保存 ${result.data.count} 个Cookie到下载工具\\n\\n关键Cookie: ${foundKeyCookies.map(c => c.name).join(', ')}\\n\\n现在可以返回下载工具开始下载了。`);
            } else {
                console.error('❌ Cookie同步失败:', result.error);
                alert('❌ Cookie同步失败: ' + result.error);
            }
        })
        .catch(error => {
            console.error('❌ 同步过程中出错:', error);
            alert('❌ 同步过程中出错: ' + error.message + '\\n\\n请确保下载工具正在运行。');
        });
    }
}
