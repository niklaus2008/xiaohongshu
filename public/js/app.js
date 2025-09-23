/**
 * 小红书餐馆图片下载工具 - 前端应用逻辑
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

class XiaohongshuDownloaderApp {
    constructor() {
        this.socket = null;
        this.restaurants = [];
        this.currentStatus = {
            isRunning: false,
            isPaused: false,
            progress: 0,
            currentRestaurant: null,
            totalRestaurants: 0,
            completedRestaurants: 0,
            failedRestaurants: 0,
            totalImages: 0,
            downloadedImages: 0,
            failedImages: 0,
            restaurantProgress: [] // 每个餐馆的进度信息
        };
        this.logs = [];
        this.editingRestaurantIndex = -1;
        
        this.init();
    }

    /**
     * 初始化应用
     */
    init() {
        this.initSocket();
        this.bindEvents();
        this.loadConfig();
        this.checkLoginStatus();
        this.updateUI();
    }

    /**
     * 初始化Socket.IO连接
     */
    initSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('已连接到服务器');
            this.addLog('已连接到服务器', 'success');
        });
        
        this.socket.on('disconnect', () => {
            console.log('与服务器断开连接');
            this.addLog('与服务器断开连接', 'warning');
        });
        
        this.socket.on('status', (status) => {
            this.currentStatus = status;
            this.updateStatusUI();
        });
        
        this.socket.on('log', (logEntry) => {
            this.addLog(logEntry.message, logEntry.level, logEntry.timestamp);
        });
        
        this.socket.on('error', (error) => {
            this.showError(error.message || '发生未知错误');
        });
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 餐馆管理事件
        document.getElementById('addRestaurantBtn').addEventListener('click', () => {
            this.showRestaurantModal();
        });
        
        document.getElementById('importBtn').addEventListener('click', () => {
            this.toggleImportArea();
        });
        
        document.getElementById('importFile').addEventListener('change', (e) => {
            this.handleImportFile(e.target.files[0]);
        });
        
        // 控制按钮事件
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startDownload();
        });
        
        // 配置管理事件
        document.getElementById('saveConfigBtn').addEventListener('click', () => {
            this.saveConfig();
        });
        
        document.getElementById('loadConfigBtn').addEventListener('click', () => {
            this.loadConfig();
        });
        
        // 日志管理事件
        document.getElementById('clearLogsBtn').addEventListener('click', () => {
            this.clearLogs();
        });
        
        // 日志级别过滤事件
        document.querySelectorAll('input[name="logLevel"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.filterLogs();
            });
        });
        
        // 餐馆模态框事件
        document.getElementById('saveRestaurantBtn').addEventListener('click', () => {
            this.saveRestaurant();
        });
        
        // 文件夹选择事件
        document.getElementById('selectFolderBtn').addEventListener('click', () => {
            this.selectOutputFolder();
        });
        
        // 登录相关事件
        document.getElementById('loginBtn').addEventListener('click', () => {
            this.openLoginModal();
        });
        
        document.getElementById('checkLoginBtn').addEventListener('click', () => {
            this.checkLoginStatus();
        });
        
        // 登录模态框事件
        document.getElementById('refreshLoginBtn').addEventListener('click', () => {
            this.refreshLoginPage();
        });
        
        document.getElementById('checkLoginStatusBtn').addEventListener('click', () => {
            this.checkLoginStatusFromModal();
        });
        
        // 添加调试信息显示
        this.addDebugInfo();
    }

    /**
     * 显示餐馆配置模态框
     * @param {number} index - 编辑的餐馆索引，-1表示新增
     */
    showRestaurantModal(index = -1) {
        this.editingRestaurantIndex = index;
        const modal = new bootstrap.Modal(document.getElementById('restaurantModal'));
        const title = document.getElementById('restaurantModalTitle');
        
        if (index >= 0) {
            // 编辑模式
            const restaurant = this.restaurants[index];
            title.textContent = '编辑餐馆';
            document.getElementById('restaurantName').value = restaurant.name;
            document.getElementById('restaurantLocation').value = restaurant.location;
            document.getElementById('restaurantMaxImages').value = restaurant.maxImages || 6;
        } else {
            // 新增模式
            title.textContent = '添加餐馆';
            document.getElementById('restaurantForm').reset();
            document.getElementById('restaurantMaxImages').value = 6;
        }
        
        modal.show();
    }

    /**
     * 保存餐馆配置
     */
    saveRestaurant() {
        const name = document.getElementById('restaurantName').value.trim();
        const location = document.getElementById('restaurantLocation').value.trim();
        const maxImages = parseInt(document.getElementById('restaurantMaxImages').value) || 6;
        
        if (!name || !location) {
            this.showError('请填写餐馆名称和地点');
            return;
        }
        
        const restaurant = {
            name,
            location,
            maxImages
        };
        
        if (this.editingRestaurantIndex >= 0) {
            // 编辑现有餐馆
            this.restaurants[this.editingRestaurantIndex] = restaurant;
            this.addLog(`已更新餐馆: ${name} (${location})`, 'success');
        } else {
            // 添加新餐馆
            this.restaurants.push(restaurant);
            this.addLog(`已添加餐馆: ${name} (${location})`, 'success');
        }
        
        this.updateRestaurantsList();
        this.updateUI();
        
        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('restaurantModal'));
        modal.hide();
    }

    /**
     * 删除餐馆
     * @param {number} index - 餐馆索引
     */
    removeRestaurant(index) {
        const restaurant = this.restaurants[index];
        if (confirm(`确定要删除餐馆 "${restaurant.name}" 吗？`)) {
            this.restaurants.splice(index, 1);
            this.addLog(`已删除餐馆: ${restaurant.name}`, 'info');
            this.updateRestaurantsList();
            this.updateUI();
        }
    }

    /**
     * 更新餐馆列表显示
     */
    updateRestaurantsList() {
        const container = document.getElementById('restaurantsList');
        
        if (this.restaurants.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-utensils"></i>
                    <h5>暂无餐馆配置</h5>
                    <p>点击"添加"按钮添加餐馆信息</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.restaurants.map((restaurant, index) => `
            <div class="restaurant-item fade-in">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="restaurant-info">
                        <div class="restaurant-name">${this.escapeHtml(restaurant.name)}</div>
                        <div class="restaurant-location">
                            <i class="fas fa-map-marker-alt me-1"></i>
                            ${this.escapeHtml(restaurant.location)}
                        </div>
                        <div class="restaurant-max-images">
                            <i class="fas fa-images me-1"></i>
                            下载的图片数: ${restaurant.maxImages}
                        </div>
                    </div>
                    <div class="restaurant-actions">
                        <button class="btn btn-sm btn-outline-primary" onclick="app.showRestaurantModal(${index})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="app.removeRestaurant(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * 切换导入区域显示
     */
    toggleImportArea() {
        const importArea = document.getElementById('importArea');
        const isVisible = importArea.style.display !== 'none';
        importArea.style.display = isVisible ? 'none' : 'block';
    }

    /**
     * 处理文件导入
     * @param {File} file - 导入的文件
     */
    handleImportFile(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                let importedRestaurants = [];
                
                if (file.name.endsWith('.json')) {
                    // JSON格式
                    importedRestaurants = JSON.parse(content);
                } else if (file.name.endsWith('.csv')) {
                    // CSV格式
                    importedRestaurants = this.parseCSV(content);
                } else {
                    throw new Error('不支持的文件格式，请使用JSON或CSV文件');
                }
                
                // 验证数据格式
                if (!Array.isArray(importedRestaurants)) {
                    throw new Error('文件格式错误，应该包含餐馆数组');
                }
                
                // 验证导入的数据
                if (importedRestaurants.length === 0) {
                    throw new Error('导入的文件中没有有效的餐馆数据');
                }
                
                // 验证每个餐馆数据的完整性
                const validRestaurants = importedRestaurants.filter(restaurant => {
                    return restaurant && 
                           typeof restaurant.name === 'string' && 
                           restaurant.name.trim() !== '' &&
                           typeof restaurant.location === 'string' && 
                           restaurant.location.trim() !== '';
                });
                
                if (validRestaurants.length === 0) {
                    throw new Error('导入的数据中没有有效的餐馆信息（需要包含餐馆名称和地点）');
                }
                
                if (validRestaurants.length < importedRestaurants.length) {
                    this.addLog(`警告：跳过了 ${importedRestaurants.length - validRestaurants.length} 个无效的餐馆数据`, 'warning');
                }
                
                // 合并到现有列表
                this.restaurants.push(...validRestaurants);
                this.addLog(`成功导入 ${validRestaurants.length} 个餐馆`, 'success');
                this.updateRestaurantsList();
                this.updateUI();
                
            } catch (error) {
                this.showError(`导入文件失败: ${error.message}`);
                this.addLog(`导入失败: ${error.message}`, 'error');
            }
        };
        
        reader.readAsText(file);
    }

    /**
     * 解析CSV内容
     * @param {string} content - CSV内容
     * @returns {Array} 餐馆数组
     */
    parseCSV(content) {
        const lines = content.split('\n').filter(line => line.trim());
        const restaurants = [];
        const errors = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const parts = line.split(',').map(part => part.trim().replace(/^"|"$/g, ''));
            
            if (parts.length < 2) {
                errors.push(`第${i + 1}行格式不正确：缺少地点信息。正确格式：餐馆名称,地点,下载的图片数(可选)`);
                continue;
            }
            
            if (!parts[0] || !parts[1]) {
                errors.push(`第${i + 1}行数据不完整：餐馆名称和地点不能为空`);
                continue;
            }
            
            restaurants.push({
                name: parts[0],
                location: parts[1],
                maxImages: parseInt(parts[2]) || 6
            });
        }
        
        // 如果有错误，显示警告信息
        if (errors.length > 0) {
            this.addLog(`CSV解析警告：${errors.join('; ')}`, 'warning');
        }
        
        return restaurants;
    }

    /**
     * 开始下载
     */
    async startDownload() {
        if (this.restaurants.length === 0) {
            this.showError('请先添加餐馆配置');
            return;
        }
        
        const outputPath = document.getElementById('outputPath').value.trim();
        if (!outputPath) {
            this.showError('请选择输出目录');
            return;
        }
        
        const options = {
            maxImages: parseInt(document.getElementById('maxImages').value) || 6,
            delay: parseInt(document.getElementById('delay').value) || 2000,
            tryRemoveWatermark: document.getElementById('removeWatermark').checked,
            enableImageProcessing: document.getElementById('enableProcessing').checked,
            headless: document.getElementById('headlessMode').checked
        };
        
        try {
            const response = await fetch('/api/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    restaurants: this.restaurants,
                    outputPath,
                    options
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.addLog('批量下载任务已开始', 'success');
            } else {
                this.showError(result.error || '启动任务失败');
            }
            
        } catch (error) {
            this.showError(`启动任务失败: ${error.message}`);
        }
    }


    /**
     * 选择输出文件夹
     */
    selectOutputFolder() {
        // 由于浏览器安全限制，无法直接选择文件夹
        // 这里提供一个输入框让用户手动输入路径
        const currentPath = document.getElementById('outputPath').value;
        const newPath = prompt('请输入输出目录路径:', currentPath);
        
        if (newPath !== null) {
            document.getElementById('outputPath').value = newPath;
        }
    }

    /**
     * 保存配置
     */
    async saveConfig() {
        const config = {
            restaurants: this.restaurants,
            outputPath: document.getElementById('outputPath').value,
            maxImages: parseInt(document.getElementById('maxImages').value) || 6,
            delay: parseInt(document.getElementById('delay').value) || 2000,
            tryRemoveWatermark: document.getElementById('removeWatermark').checked,
            enableImageProcessing: document.getElementById('enableProcessing').checked,
            headless: document.getElementById('headlessMode').checked
        };
        
        try {
            const response = await fetch('/api/config/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ config })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.addLog('配置已保存', 'success');
            } else {
                this.showError(result.error || '保存配置失败');
            }
            
        } catch (error) {
            this.showError(`保存配置失败: ${error.message}`);
        }
    }

    /**
     * 加载配置
     */
    async loadConfig() {
        try {
            const response = await fetch('/api/config/load');
            const result = await response.json();
            
            if (result.success && result.data) {
                const config = result.data;
                
                // 恢复餐馆列表
                if (config.restaurants) {
                    this.restaurants = config.restaurants;
                    this.updateRestaurantsList();
                }
                
                // 恢复其他配置
                if (config.outputPath) {
                    document.getElementById('outputPath').value = config.outputPath;
                }
                if (config.maxImages) {
                    document.getElementById('maxImages').value = config.maxImages;
                }
                if (config.delay) {
                    document.getElementById('delay').value = config.delay;
                }
                if (config.tryRemoveWatermark !== undefined) {
                    document.getElementById('removeWatermark').checked = config.tryRemoveWatermark;
                }
                if (config.enableImageProcessing !== undefined) {
                    document.getElementById('enableProcessing').checked = config.enableImageProcessing;
                }
                if (config.headless !== undefined) {
                    document.getElementById('headlessMode').checked = config.headless;
                }
                
                this.addLog('配置已加载', 'success');
                this.updateUI();
            }
            
        } catch (error) {
            console.log('加载配置失败:', error);
        }
    }

    /**
     * 更新状态UI
     */
    updateStatusUI() {
        // 更新进度条
        const progressBar = document.getElementById('overallProgressBar');
        const progressText = document.getElementById('overallProgress');
        progressBar.style.width = `${this.currentStatus.progress}%`;
        progressText.textContent = `${this.currentStatus.progress}%`;
        
        // 更新当前餐馆信息
        const currentRestaurant = document.getElementById('currentRestaurant');
        if (this.currentStatus.currentRestaurant) {
            currentRestaurant.textContent = `${this.currentStatus.currentRestaurant.name} (${this.currentStatus.currentRestaurant.location})`;
        } else {
            currentRestaurant.textContent = '暂无';
        }
        
        // 更新状态
        const currentStatus = document.getElementById('currentStatus');
        let statusBadge = '';
        if (this.currentStatus.isRunning) {
            if (this.currentStatus.isPaused) {
                statusBadge = '<span class="badge bg-warning">已暂停</span>';
            } else {
                statusBadge = '<span class="badge bg-success">运行中</span>';
            }
        } else {
            statusBadge = '<span class="badge bg-secondary">待机</span>';
        }
        currentStatus.innerHTML = statusBadge;
        
        
        // 更新餐馆进度列表
        this.updateRestaurantsProgress();
        
        // 更新按钮状态
        this.updateButtonStates();
    }

    /**
     * 更新餐馆进度列表
     */
    updateRestaurantsProgress() {
        const container = document.getElementById('restaurantsProgress');
        
        if (this.restaurants.length === 0) {
            container.innerHTML = `
                <div class="text-muted text-center py-3">
                    <i class="fas fa-info-circle me-2"></i>
                    暂无餐馆配置
                </div>
            `;
            return;
        }
        
        // 如果没有进度信息，显示初始状态
        if (!this.currentStatus.restaurantProgress || this.currentStatus.restaurantProgress.length === 0) {
            container.innerHTML = this.restaurants.map((restaurant, index) => `
                <div class="restaurant-progress-item mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="restaurant-name">${this.escapeHtml(restaurant.name)} (${this.escapeHtml(restaurant.location)})</span>
                        <span class="badge bg-secondary">等待中</span>
                    </div>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                    </div>
                </div>
            `).join('');
            return;
        }
        
        // 显示进度信息
        container.innerHTML = this.restaurants.map((restaurant, index) => {
            const progress = this.currentStatus.restaurantProgress[index] || {
                status: 'pending',
                progress: 0,
                images: 0,
                downloaded: 0
            };
            
            let statusBadge = '';
            let progressClass = '';
            
            switch (progress.status) {
                case 'completed':
                    statusBadge = '<span class="badge bg-success">已完成</span>';
                    progressClass = 'bg-success';
                    break;
                case 'processing':
                    statusBadge = '<span class="badge bg-primary">处理中</span>';
                    progressClass = 'bg-primary';
                    break;
                case 'failed':
                    statusBadge = '<span class="badge bg-danger">失败</span>';
                    progressClass = 'bg-danger';
                    break;
                default:
                    statusBadge = '<span class="badge bg-secondary">等待中</span>';
                    progressClass = 'bg-secondary';
            }
            
            return `
                <div class="restaurant-progress-item mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="restaurant-name">${this.escapeHtml(restaurant.name)} (${this.escapeHtml(restaurant.location)})</span>
                        ${statusBadge}
                    </div>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar ${progressClass}" role="progressbar" style="width: ${progress.progress}%"></div>
                    </div>
                    <small class="text-muted">${progress.downloaded || 0} / ${progress.images || 0} 张图片</small>
                </div>
            `;
        }).join('');
    }

    /**
     * 更新按钮状态
     */
    updateButtonStates() {
        const startBtn = document.getElementById('startBtn');
        
        if (this.currentStatus.isRunning) {
            startBtn.disabled = true;
        } else {
            startBtn.disabled = this.restaurants.length === 0;
        }
    }

    /**
     * 更新UI状态
     */
    updateUI() {
        this.updateButtonStates();
        this.updateRestaurantsList();
    }

    /**
     * 添加日志
     * @param {string} message - 日志消息
     * @param {string} level - 日志级别
     * @param {string} timestamp - 时间戳
     */
    addLog(message, level = 'info', timestamp = null) {
        const logEntry = {
            timestamp: timestamp || new Date().toISOString(),
            level,
            message
        };
        
        this.logs.push(logEntry);
        
        // 保持日志数量在合理范围内
        if (this.logs.length > 1000) {
            this.logs = this.logs.slice(-500);
        }
        
        this.updateLogsDisplay();
    }

    /**
     * 更新日志显示
     */
    updateLogsDisplay() {
        const container = document.getElementById('logsContainer');
        const selectedLevel = document.querySelector('input[name="logLevel"]:checked').id;
        
        let filteredLogs = this.logs;
        if (selectedLevel !== 'logAll') {
            const level = selectedLevel.replace('log', '').toLowerCase();
            filteredLogs = this.logs.filter(log => log.level === level);
        }
        
        if (filteredLogs.length === 0) {
            container.innerHTML = `
                <div class="text-muted text-center py-3">
                    <i class="fas fa-info-circle me-2"></i>
                    暂无日志信息
                </div>
            `;
            return;
        }
        
        container.innerHTML = filteredLogs.map(log => `
            <div class="log-entry">
                <span class="log-timestamp">${this.formatTimestamp(log.timestamp)}</span>
                <span class="log-level ${log.level}">${this.getLevelText(log.level)}</span>
                <span class="log-message">${this.escapeHtml(log.message)}</span>
            </div>
        `).join('');
        
        // 滚动到底部
        container.scrollTop = container.scrollHeight;
    }

    /**
     * 过滤日志
     */
    filterLogs() {
        this.updateLogsDisplay();
    }

    /**
     * 清空日志
     */
    clearLogs() {
        this.logs = [];
        this.updateLogsDisplay();
        this.addLog('日志已清空', 'info');
    }

    /**
     * 格式化时间戳
     * @param {string} timestamp - 时间戳
     * @returns {string} 格式化后的时间
     */
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('zh-CN', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    /**
     * 获取日志级别文本
     * @param {string} level - 日志级别
     * @returns {string} 级别文本
     */
    getLevelText(level) {
        const levelMap = {
            'info': '信息',
            'success': '成功',
            'warning': '警告',
            'error': '错误'
        };
        return levelMap[level] || level;
    }

    /**
     * 显示错误信息
     * @param {string} message - 错误消息
     */
    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        const modal = new bootstrap.Modal(document.getElementById('errorModal'));
        modal.show();
        this.addLog(`错误: ${message}`, 'error');
    }

    /**
     * HTML转义
     * @param {string} text - 原始文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 添加调试信息
     */
    addDebugInfo() {
        // 在控制台输出当前状态
        console.log('当前餐馆列表状态:', {
            count: this.restaurants.length,
            restaurants: this.restaurants,
            buttonDisabled: this.restaurants.length === 0
        });
        
        // 在界面上显示调试信息
        this.addLog(`调试信息：当前有 ${this.restaurants.length} 个餐馆配置`, 'info');
        
        if (this.restaurants.length === 0) {
            this.addLog('提示：请添加餐馆配置或导入餐馆列表文件', 'info');
        }
    }

    /**
     * 检查登录状态
     */
    async checkLoginStatus() {
        try {
            const response = await fetch('/api/login/status');
            const result = await response.json();
            
            if (result.success) {
                this.updateLoginStatus(result.data);
            } else {
                this.updateLoginStatus({ isLoggedIn: false, error: result.error });
            }
        } catch (error) {
            console.error('检查登录状态失败:', error);
            this.updateLoginStatus({ isLoggedIn: false, error: error.message });
        }
    }

    /**
     * 更新登录状态显示
     */
    updateLoginStatus(data) {
        const loginStatusDiv = document.getElementById('loginStatus');
        const loginBtn = document.getElementById('loginBtn');
        const checkLoginBtn = document.getElementById('checkLoginBtn');
        
        if (data.isLoggedIn) {
            loginStatusDiv.innerHTML = `
                <div class="text-success">
                    <i class="fas fa-check-circle fa-2x mb-2"></i>
                    <p class="mb-0"><strong>已登录</strong></p>
                    <small class="text-muted">Cookie数量: ${data.cookieInfo.count}</small>
                </div>
            `;
            loginBtn.style.display = 'none';
            checkLoginBtn.style.display = 'block';
            
            // 启用开始下载按钮
            this.updateStartButton();
        } else {
            loginStatusDiv.innerHTML = `
                <div class="text-warning">
                    <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                    <p class="mb-0"><strong>未登录</strong></p>
                    <small class="text-muted">${data.error || '需要登录小红书才能下载图片'}</small>
                </div>
            `;
            loginBtn.style.display = 'block';
            checkLoginBtn.style.display = 'block';
            
            // 禁用开始下载按钮
            document.getElementById('startBtn').disabled = true;
        }
    }

    /**
     * 打开登录窗口
     */
    openLoginModal() {
        // 使用新窗口打开小红书登录页面
        const loginUrl = 'https://www.xiaohongshu.com/explore';
        const loginWindow = window.open(
            loginUrl, 
            'xiaohongshu_login', 
            'width=800,height=600,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no'
        );
        
        if (loginWindow) {
            this.addLog('已打开小红书登录窗口，请完成登录', 'info');
            
            // 监听窗口关闭事件
            const checkClosed = setInterval(() => {
                if (loginWindow.closed) {
                    clearInterval(checkClosed);
                    this.addLog('登录窗口已关闭，正在自动检测登录状态...', 'info');
                    
                    // 延迟检查登录状态，给用户时间完成登录
                    setTimeout(() => {
                        this.autoDetectLoginStatus();
                    }, 2000);
                }
            }, 1000);
            
            // 显示提示信息
            setTimeout(() => {
                if (!loginWindow.closed) {
                    this.addLog('💡 提示：完成登录后请关闭登录窗口，系统会自动检测登录状态', 'info');
                }
            }, 3000);
            
        } else {
            this.addLog('❌ 无法打开登录窗口，可能被浏览器阻止了弹窗', 'error');
            this.addLog('💡 请允许弹窗或手动访问：https://www.xiaohongshu.com/explore', 'info');
        }
    }

    /**
     * 自动检测登录状态
     */
    async autoDetectLoginStatus() {
        try {
            this.addLog('🔍 正在自动检测登录状态...', 'info');
            
            // 首先检查本地登录状态
            const response = await fetch('/api/login/status');
            const result = await response.json();
            
            if (result.success && result.data.isLoggedIn) {
                this.addLog('✅ 检测到已登录状态，无需重新登录', 'success');
                this.checkLoginStatus();
                return;
            }
            
            // 如果没有登录状态，尝试自动获取Cookie
            this.addLog('💡 未检测到登录状态，正在尝试自动获取Cookie...', 'info');
            
            // 创建一个隐藏的iframe来获取小红书Cookie
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = 'https://www.xiaohongshu.com/explore';
            document.body.appendChild(iframe);
            
            // 等待iframe加载
            iframe.onload = async () => {
                try {
                    // 尝试从iframe获取Cookie（注意：由于跨域限制，这可能不会成功）
                    this.addLog('⚠️ 由于浏览器安全限制，无法自动获取Cookie', 'warning');
                    this.addLog('💡 请手动完成登录，或使用Cookie同步功能', 'info');
                    
                    // 移除iframe
                    document.body.removeChild(iframe);
                    
                    // 显示手动登录提示
                    this.showManualLoginPrompt();
                    
                } catch (error) {
                    console.error('自动检测失败:', error);
                    this.addLog('❌ 自动检测失败，请手动完成登录', 'error');
                    document.body.removeChild(iframe);
                }
            };
            
            // 设置超时
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                    this.addLog('⏰ 自动检测超时，请手动完成登录', 'warning');
                    this.showManualLoginPrompt();
                }
            }, 10000);
            
        } catch (error) {
            console.error('自动检测登录状态失败:', error);
            this.addLog('❌ 自动检测失败: ' + error.message, 'error');
        }
    }

    /**
     * 显示手动登录提示
     */
    showManualLoginPrompt() {
        this.addLog('📋 手动登录步骤：', 'info');
        this.addLog('1. 在新标签页中打开小红书并登录', 'info');
        this.addLog('2. 登录完成后，点击"重新检查登录状态"按钮', 'info');
        this.addLog('3. 或者使用Cookie同步功能', 'info');
        
        // 显示重新检查按钮
        const checkBtn = document.getElementById('checkLoginBtn');
        if (checkBtn) {
            checkBtn.style.display = 'inline-block';
        }
    }

    /**
     * 刷新登录页面
     */
    refreshLoginPage() {
        const iframe = document.getElementById('loginIframe');
        iframe.src = iframe.src; // 重新加载当前页面
        this.addLog('已刷新登录页面', 'info');
    }

    /**
     * 从模态框中检查登录状态
     */
    async checkLoginStatusFromModal() {
        try {
            // 显示加载状态
            const checkBtn = document.getElementById('checkLoginStatusBtn');
            const originalText = checkBtn.innerHTML;
            checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>检查中...';
            checkBtn.disabled = true;
            
            // 检查登录状态
            await this.checkLoginStatus();
            
            // 如果登录成功，关闭模态框
            const response = await fetch('/api/login/status');
            const result = await response.json();
            
            if (result.success && result.data.isLoggedIn) {
                // 关闭模态框
                const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                modal.hide();
                
                this.addLog('登录成功！模态框已关闭', 'success');
            } else {
                this.addLog('登录状态检查失败，请确保已完成登录', 'warning');
            }
            
        } catch (error) {
            console.error('检查登录状态失败:', error);
            this.addLog('检查登录状态失败: ' + error.message, 'error');
        } finally {
            // 恢复按钮状态
            const checkBtn = document.getElementById('checkLoginStatusBtn');
            checkBtn.innerHTML = '<i class="fas fa-check me-1"></i>检查登录状态';
            checkBtn.disabled = false;
        }
    }

    /**
     * 验证当前页面的Cookie
     */
    async validateCurrentPageCookies() {
        try {
            this.addLog('🔍 正在验证当前页面的Cookie...', 'info');
            
            // 获取当前页面的所有Cookie
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
                this.addLog('❌ 当前页面没有找到Cookie', 'error');
                return false;
            }

            this.addLog(`📋 找到 ${cookies.length} 个Cookie，正在验证...`, 'info');

            // 发送到后端验证
            const response = await fetch('/api/login/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cookies })
            });

            const result = await response.json();

            if (result.success && result.data.isValid) {
                this.addLog('✅ Cookie验证成功！登录状态已同步', 'success');
                // 更新登录状态显示
                this.checkLoginStatus();
                return true;
            } else {
                this.addLog(`❌ Cookie验证失败: ${result.data.message}`, 'error');
                return false;
            }

        } catch (error) {
            this.addLog(`❌ Cookie验证过程中出错: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * 更新开始下载按钮状态
     */
    updateStartButton() {
        const startBtn = document.getElementById('startBtn');
        const hasRestaurants = this.restaurants.length > 0;
        
        // 检查登录状态
        fetch('/api/login/status')
            .then(response => response.json())
            .then(result => {
                if (result.success && result.data.isLoggedIn && hasRestaurants) {
                    startBtn.disabled = false;
                } else {
                    startBtn.disabled = true;
                }
            })
            .catch(error => {
                console.error('检查登录状态失败:', error);
                startBtn.disabled = true;
            });
    }
}

// 初始化应用
const app = new XiaohongshuDownloaderApp();
