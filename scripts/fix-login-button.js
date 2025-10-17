// 临时修复脚本 - 在浏览器控制台中运行
console.log('开始修复登录按钮显示问题...');

// 等待页面加载完成
setTimeout(() => {
    const loginBtn = document.getElementById('loginBtn');
    const checkLoginBtn = document.getElementById('checkLoginBtn');
    const loginStatus = document.getElementById('loginStatus');
    
    if (loginBtn && checkLoginBtn && loginStatus) {
        console.log('找到登录相关元素');
        
        // 强制显示登录按钮
        loginBtn.style.display = 'block';
        checkLoginBtn.style.display = 'block';
        
        // 更新登录状态显示
        loginStatus.innerHTML = `
            <div class="text-warning">
                <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                <p class="mb-0"><strong>未登录</strong></p>
                <small class="text-muted">需要登录小红书才能下载图片</small>
            </div>
        `;
        
        console.log('登录按钮已显示');
    } else {
        console.error('未找到登录相关元素');
        console.log('loginBtn:', loginBtn);
        console.log('checkLoginBtn:', checkLoginBtn);
        console.log('loginStatus:', loginStatus);
    }
}, 1000);

// 添加点击事件
setTimeout(() => {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            console.log('登录按钮被点击');
            alert('登录按钮工作正常！');
        });
    }
}, 2000);
