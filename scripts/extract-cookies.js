// Cookie提取脚本 - 在小红书页面中运行
// 使用方法：在小红书页面按F12打开控制台，粘贴并运行此代码

console.log('开始提取小红书Cookie...');

// 检查是否在小红书页面
if (!window.location.hostname.includes('xiaohongshu.com')) {
    console.error('请在小红书页面中运行此脚本');
} else {
    // 获取所有Cookie
    const cookies = document.cookie.split(';').map(cookie => {
        const [name, value] = cookie.trim().split('=');
        return {
            name: name,
            value: value,
            domain: window.location.hostname,
            path: '/',
            expires: Date.now() / 1000 + 30 * 24 * 60 * 60 // 30天后过期
        };
    }).filter(cookie => cookie.name && cookie.value);

    if (cookies.length === 0) {
        console.log('未找到Cookie，请确保已登录小红书');
    } else {
        console.log(`找到 ${cookies.length} 个Cookie:`, cookies);
        
        // 发送Cookie到下载工具
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
                console.log('✅ Cookie已成功保存到下载工具！');
                console.log(`保存了 ${result.data.count} 个Cookie`);
                alert(`✅ Cookie已成功保存到下载工具！\n\n保存了 ${result.data.count} 个Cookie\n\n现在可以返回下载工具开始下载了。`);
            } else {
                console.error('❌ 保存Cookie失败:', result.error);
                alert('❌ 保存Cookie失败: ' + result.error);
            }
        })
        .catch(error => {
            console.error('❌ 发送Cookie失败:', error);
            alert('❌ 发送Cookie失败: ' + error.message + '\n\n请确保下载工具正在运行。');
        });
    }
}
