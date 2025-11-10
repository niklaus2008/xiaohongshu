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
        this.isLoginWindowOpen = false; // 登录窗口状态标记
        
        this.init();
    }

    /**
     * 初始化应用
     */
    init() {
        this.initSocket();
        this.bindEvents();
        
        // 并行执行异步操作，避免串行等待
        this.initializeAsync();
        
        // 立即更新UI，不等待异步操作
        this.updateUI();
    }

    /**
     * 并行初始化异步操作
     */
    async initializeAsync() {
        try {
            // 加载配置
            await this.loadConfig();
            
            // 更新UI状态
            this.updateUI();
            
        } catch (error) {
            console.error('异步初始化失败:', error);
            this.addLog('初始化过程中出现错误，但应用仍可正常使用', 'warning');
        }
    }

    /**
     * 初始化Socket.IO连接
     */
    initSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('已连接到服务器');
            this.addLog('已连接到服务器', 'success');
            this.addLog('服务状态：正常运行', 'info');
        });
        
        this.socket.on('disconnect', () => {
            console.log('与服务器断开连接');
            this.addLog('与服务器断开连接', 'warning');
            this.addLog('服务状态：连接中断', 'warning');
        });
        
        this.socket.on('status', (status) => {
            this.currentStatus = status;
            this.updateStatusUI();
            // 添加服务状态日志
            this.addServiceStatusLogs(status);
        });
        
        this.socket.on('log', (logEntry) => {
            this.addLog(logEntry.message, logEntry.level, logEntry.timestamp);
        });
        
        this.socket.on('error', (error) => {
            this.showError(error.message || '发生未知错误');
            this.addLog('服务状态：出现错误', 'error');
        });
        
        // 监听任务完成事件
        this.socket.on('task_completed', (data) => {
            console.log('收到任务完成事件:', data);
            this.addLog('🎉 任务已完成，正在停止心跳检测...', 'success');
            this.handleTaskCompletion(data);
        });
        
        // 监听最终任务完成事件
        this.socket.on('task_final_completed', (data) => {
            console.log('收到最终任务完成事件:', data);
            this.addLog('✅ 所有任务已完成，前端日志将停止', 'success');
            this.handleFinalTaskCompletion(data);
        });
        
        // 监听心跳停止事件
        this.socket.on('heartbeat_stopped', (data) => {
            console.log('收到心跳停止事件:', data);
            this.addLog('💓 心跳检测已停止', 'info');
            this.stopServiceHeartbeat();
        });
        
        // 添加服务心跳检测
        this.startServiceHeartbeat();
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
        
        // 登录模态框事件（仍然保留，因为登录模态框还在）
        document.getElementById('refreshLoginBtn').addEventListener('click', () => {
            this.refreshLoginPage();
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
            // 移除餐馆单独图片数设置，统一使用全局配置
        } else {
            // 新增模式
            title.textContent = '添加餐馆';
            document.getElementById('restaurantForm').reset();
            // 移除餐馆单独图片数设置，统一使用全局配置
        }
        
        modal.show();
    }

    /**
     * 保存餐馆配置
     */
    saveRestaurant() {
        const name = document.getElementById('restaurantName').value.trim();
        const location = document.getElementById('restaurantLocation').value.trim();
        // 统一使用全局配置的图片数
        const maxImages = parseInt(document.getElementById('maxImages').value) || 10;
        
        if (!name) {
            this.showError('请填写餐馆名称');
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
        this.restaurants.splice(index, 1);
        this.addLog(`已删除餐馆: ${restaurant.name}`, 'info');
        this.updateRestaurantsList();
        this.updateUI();
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
                            ${restaurant.location ? this.escapeHtml(restaurant.location) : '未设置地点'}
                        </div>
                        <div class="restaurant-max-images">
                            <i class="fas fa-images me-1"></i>
                            下载的图片数: ${parseInt(document.getElementById('maxImages').value) || 10}
                        </div>
                    </div>
                    <div class="restaurant-actions">
                        <button class="btn btn-sm btn-outline-primary" onclick="app.showRestaurantModal(${index})" title="编辑餐馆">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="app.removeRestaurant(${index})" title="删除餐馆" type="button">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        console.log('🔄 餐馆列表已更新，当前餐馆数量:', this.restaurants.length);
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
                    if (!restaurant || typeof restaurant.name !== 'string') {
                        return false;
                    }
                    
                    // 更彻底的字符串清理：清理所有类型的空白字符
                    const cleanName = restaurant.name.replace(/[\r\n\t\s]+/g, ' ').trim();
                    const cleanLocation = restaurant.location ? restaurant.location.replace(/[\r\n\t\s]+/g, ' ').trim() : '';
                    
                    this.addLog(`验证餐馆数据：名称="${cleanName}", 地点="${cleanLocation}"`, 'debug');
                    
                    return cleanName !== '';
                });
                
                if (validRestaurants.length === 0) {
                    throw new Error('导入的数据中没有有效的餐馆信息（需要包含餐馆名称）');
                }
                
                if (validRestaurants.length < importedRestaurants.length) {
                    this.addLog(`警告：跳过了 ${importedRestaurants.length - validRestaurants.length} 个无效的餐馆数据`, 'warning');
                }
                
                // 检查是否清空之前的任务
                const clearExisting = document.getElementById('clearExisting').checked;
                if (clearExisting) {
                    this.restaurants = [];
                    this.addLog('已清空之前的任务', 'info');
                }
                
                // 清理并添加新导入的餐馆
                const cleanedRestaurants = validRestaurants.map(restaurant => ({
                    name: restaurant.name.replace(/[\r\n\t\s]+/g, ' ').trim(),
                    location: restaurant.location ? restaurant.location.replace(/[\r\n\t\s]+/g, ' ').trim() : ''
                    // 移除maxImages，统一使用全局配置
                }));
                
                this.restaurants.push(...cleanedRestaurants);
                this.addLog(`成功导入 ${cleanedRestaurants.length} 个餐馆`, 'success');
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
     * 解析CSV行，正确处理引号内的逗号
     * @param {string} line - CSV行
     * @returns {Array} 分割后的字段数组
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        // 添加最后一个字段
        result.push(current);
        
        // 清理每个字段：移除引号并清理所有空白字符
        return result.map(field => {
            // 移除字段两端的引号
            let cleaned = field.replace(/^"|"$/g, '');
            // 清理所有类型的空白字符（包括换行符、制表符、回车符等）
            cleaned = cleaned.replace(/[\r\n\t\s]+/g, ' ').trim();
            return cleaned;
        });
    }

    /**
     * 解析CSV内容
     * @param {string} content - CSV内容
     * @returns {Array} 餐馆数组
     */
    parseCSV(content) {
        // 先清理内容，处理跨行数据
        const cleanedContent = this.cleanCSVContent(content);
        
        // 处理多种换行符格式（\r\n, \n, \r）
        const lines = cleanedContent.split(/\r?\n|\r/).filter(line => line.trim());
        const restaurants = [];
        const errors = [];
        
        this.addLog(`开始解析CSV文件，共${lines.length}行数据`, 'info');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            
            this.addLog(`解析第${i + 1}行：${line}`, 'debug');
            
            // 改进的CSV解析，正确处理引号内的逗号
            const parts = this.parseCSVLine(line);
            
            this.addLog(`解析结果：${JSON.stringify(parts)}`, 'debug');
            
            if (parts.length < 1) {
                errors.push(`第${i + 1}行格式不正确：缺少餐馆名称。正确格式：餐馆名称,地点(可选),下载的图片数(可选)`);
                continue;
            }
            
            if (!parts[0]) {
                errors.push(`第${i + 1}行数据不完整：餐馆名称不能为空`);
                continue;
            }
            
            const restaurant = {
                name: parts[0],
                location: parts[1] || '' // 地点可以为空
                // 移除maxImages，统一使用全局配置
            };
            
            this.addLog(`成功解析餐馆：${restaurant.name}${restaurant.location ? ` - ${restaurant.location}` : ' (未设置地点)'}`, 'success');
            restaurants.push(restaurant);
        }
        
        // 如果有错误，显示警告信息
        if (errors.length > 0) {
            this.addLog(`CSV解析警告：${errors.join('; ')}`, 'warning');
        }
        
        this.addLog(`CSV解析完成，成功解析${restaurants.length}个餐馆`, 'info');
        return restaurants;
    }

    /**
     * 清理CSV内容，处理跨行数据
     * @param {string} content - 原始CSV内容
     * @returns {string} 清理后的CSV内容
     */
    cleanCSVContent(content) {
        // 简化逻辑：直接按行分割，不进行跨行合并
        // 因为大多数CSV文件都是标准格式，不需要复杂的跨行处理
        const lines = content.split(/\r?\n|\r/).filter(line => line.trim());
        
        this.addLog(`CSV内容清理：${lines.length}行数据`, 'debug');
        lines.forEach((line, index) => {
            this.addLog(`第${index + 1}行：${line}`, 'debug');
        });
        
        return lines.join('\n');
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
        
        // 清空之前的未完成任务并给用户提示
        this.addLog('🧹 正在清空之前的未完成任务...', 'info');
        this.addLog('📋 准备开始新的下载任务', 'info');
        
        // 重置状态
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
            restaurantProgress: []
        };
        
        // 清空日志（可选，保留最近的日志）
        if (this.logs.length > 50) {
            this.logs = this.logs.slice(-20); // 保留最近20条日志
            this.addLog('📝 已清理旧日志，保留最近记录', 'info');
        }
        
        const options = {
            maxImages: parseInt(document.getElementById('maxImages').value) || 10,
            delay: parseInt(document.getElementById('delay').value) || 2000,
            tryRemoveWatermark: document.getElementById('removeWatermark').checked,
            enableImageProcessing: document.getElementById('enableProcessing').checked,
            headless: document.getElementById('headlessMode').checked
        };
        
        try {
            // 添加服务状态日志
            this.addLog('🚀 服务状态：正在启动下载任务', 'info');
            this.addLog(`📊 服务状态：准备处理 ${this.restaurants.length} 个餐馆`, 'info');
            
            const response = await fetch('/api/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    restaurants: this.restaurants,
                    outputPath,
                    options,
                    aiConfig: this.getAiConfig()
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.addLog('批量下载任务已开始', 'success');
                this.addLog('服务状态：任务队列已启动', 'success');
            } else {
                this.showError(result.error || '启动任务失败');
                this.addLog('服务状态：任务启动失败', 'error');
            }
            
        } catch (error) {
            this.showError(`启动任务失败: ${error.message}`);
            this.addLog('服务状态：任务启动异常', 'error');
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
            maxImages: parseInt(document.getElementById('maxImages').value) || 10,
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
                // 配置加载完成后立即更新UI
                this.updateUI();
            }
            
        } catch (error) {
            console.log('加载配置失败:', error);
            // 即使配置加载失败，也不影响应用正常使用
            this.addLog('配置加载失败，使用默认配置', 'warning');
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
        if (this.currentStatus.isPreLogin) {
            currentRestaurant.textContent = `预登录中... (${this.currentStatus.preLoginProgress}%)`;
        } else if (this.currentStatus.currentRestaurant) {
            currentRestaurant.textContent = `${this.currentStatus.currentRestaurant.name} (${this.currentStatus.currentRestaurant.location})`;
        } else {
            currentRestaurant.textContent = '暂无';
        }
        
        // 更新状态
        const currentStatus = document.getElementById('currentStatus');
        const checkBtn = document.getElementById('checkCrossWindowLoginBtn');
        let statusBadge = '';
        if (this.currentStatus.isPreLogin) {
            statusBadge = '<span class="badge bg-info">预登录中</span>';
        } else if (this.currentStatus.isRunning) {
            if (this.currentStatus.isPaused) {
                statusBadge = '<span class="badge bg-warning">已暂停</span>';
            } else {
                statusBadge = '<span class="badge bg-success">运行中</span>';
                // 运行中时显示检测按钮
                if (checkBtn) checkBtn.style.display = 'inline-block';
            }
        } else {
            statusBadge = '<span class="badge bg-secondary">待机</span>';
            // 待机时隐藏检测按钮
            if (checkBtn) checkBtn.style.display = 'none';
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
        const summaryElement = document.getElementById('progressSummary');
        
        if (this.restaurants.length === 0) {
            container.innerHTML = `
                <div class="text-muted text-center py-3">
                    <i class="fas fa-info-circle me-2"></i>
                    暂无餐馆配置
                </div>
            `;
            if (summaryElement) summaryElement.textContent = '0/0 完成';
            return;
        }
        
        // 计算完成数量
        let completedCount = 0;
        let totalCount = this.restaurants.length;
        
        // 如果没有进度信息，显示初始状态
        if (!this.currentStatus.restaurantProgress || this.currentStatus.restaurantProgress.length === 0) {
            container.innerHTML = this.restaurants.map((restaurant, index) => `
                <div class="restaurant-progress-item">
                    <div class="restaurant-info">
                        <div class="restaurant-name">${this.escapeHtml(restaurant.name)} ${restaurant.location ? `(${this.escapeHtml(restaurant.location)})` : '(未设置地点)'}</div>
                    </div>
                    <div class="restaurant-progress">
                        <div class="progress">
                            <div class="progress-bar bg-secondary" role="progressbar" style="width: 0%"></div>
                        </div>
                        <div class="progress-text">0/0</div>
                        <span class="status-badge">
                            <span class="badge bg-secondary">等待中</span>
                        </span>
                    </div>
                </div>
            `).join('');
            if (summaryElement) summaryElement.textContent = `0/${totalCount} 完成`;
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
                    completedCount++;
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
                <div class="restaurant-progress-item">
                    <div class="restaurant-info">
                        <div class="restaurant-name">${this.escapeHtml(restaurant.name)} ${restaurant.location ? `(${this.escapeHtml(restaurant.location)})` : '(未设置地点)'}</div>
                    </div>
                    <div class="restaurant-progress">
                        <div class="progress">
                            <div class="progress-bar ${progressClass}" role="progressbar" style="width: ${progress.progress}%"></div>
                        </div>
                        <div class="progress-text">${progress.downloaded || 0}/${progress.images || 0}</div>
                        <span class="status-badge">
                            ${statusBadge}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
        
        // 更新进度摘要
        if (summaryElement) {
            summaryElement.textContent = `${completedCount}/${totalCount} 完成`;
        }
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
        
        // 添加服务启动日志
        this.addLog('服务状态：Web界面已启动', 'success');
        this.addLog('服务状态：等待用户操作', 'info');
    }

    /**
     * 打开登录窗口
     */
    async openLoginModal() {
        // 防止重复打开登录窗口
        if (this.isLoginWindowOpen) {
            this.addLog('⚠️ 登录窗口已打开，请勿重复点击', 'warning');
            this.addLog('💡 如果看不到登录窗口，请点击"重置登录状态"按钮', 'info');
            return;
        }
        
        try {
            // 禁用登录按钮，防止重复点击
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>正在打开登录窗口...';
            }
            
            this.addLog('🌐 正在通过后端API打开登录窗口...', 'info');
            
            // 调用后端API打开登录窗口
            const response = await fetch('/api/open-browser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: 'https://www.xiaohongshu.com/explore'
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 标记登录窗口已打开
                this.isLoginWindowOpen = true;
                
                this.addLog('✅ 登录窗口已通过后端API打开', 'success');
                this.addLog('💡 请检查浏览器窗口，如果看不到请尝试以下方法：', 'info');
                this.addLog('   - 按 Alt+Tab (Windows) 或 Cmd+Tab (Mac) 切换窗口', 'info');
                this.addLog('   - 检查任务栏或Dock中的浏览器图标', 'info');
                this.addLog('   - 查看是否有新的浏览器窗口被打开', 'info');
                
                // 显示登录按钮状态
                if (loginBtn) {
                    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt me-1"></i>登录窗口已打开';
                }
                
                // 延迟检查登录状态
                setTimeout(() => {
                    this.addLog('💡 完成登录后，请点击"检查登录状态"按钮', 'info');
                }, 3000);
                
            } else {
                this.addLog(`❌ 打开登录窗口失败: ${result.error || '未知错误'}`, 'error');
                this.addLog('💡 请尝试点击"重置登录状态"按钮后重试', 'info');
                
                // 恢复登录按钮状态
                this.resetLoginButton();
            }
            
        } catch (error) {
            console.error('打开登录窗口失败:', error);
            this.addLog(`❌ 打开登录窗口失败: ${error.message}`, 'error');
            this.addLog('💡 请检查网络连接或尝试点击"重置登录状态"按钮', 'info');
            
            // 恢复登录按钮状态
            this.resetLoginButton();
        }
    }

    /**
     * 重置登录按钮状态
     */
    resetLoginButton() {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt me-1"></i>登录小红书';
        }
    }

    /**
     * 重置登录窗口状态
     */
    async resetLoginWindow() {
        try {
            this.addLog('🔄 正在重置登录窗口状态...', 'info');
            
            const response = await fetch('/api/login/reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.isLoginWindowOpen = false;
                this.resetLoginButton();
                this.addLog('✅ 登录窗口状态已重置', 'success');
                this.addLog('💡 现在可以重新点击"登录小红书"按钮', 'info');
            } else {
                this.addLog(`❌ 重置失败: ${result.error}`, 'error');
            }
            
        } catch (error) {
            this.addLog(`❌ 重置登录窗口失败: ${error.message}`, 'error');
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
        
        // 移除登录状态检查，直接根据是否有餐馆配置来启用按钮
        // 登录状态将在实际开始下载时由后端自动处理
        if (hasRestaurants) {
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fas fa-play me-2"></i>开始下载';
        } else {
            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fas fa-play me-2"></i>开始下载 (请先添加餐馆)';
        }
    }

    /**
     * 添加服务状态日志
     * @param {Object} status - 服务状态对象
     */
    addServiceStatusLogs(status) {
        // 只在状态变化时添加日志，避免重复
        if (!this.lastServiceStatus) {
            this.lastServiceStatus = {};
        }

        // 检查运行状态变化
        if (this.lastServiceStatus.isRunning !== status.isRunning) {
            if (status.isRunning) {
                this.addLog('服务状态：开始处理任务', 'info');
            } else {
                this.addLog('服务状态：任务处理完成', 'success');
            }
        }

        // 检查暂停状态变化
        if (this.lastServiceStatus.isPaused !== status.isPaused) {
            if (status.isPaused) {
                this.addLog('服务状态：任务已暂停', 'warning');
            } else if (status.isRunning) {
                this.addLog('服务状态：任务已恢复', 'info');
            }
        }

        // 检查当前餐馆变化
        if (this.lastServiceStatus.currentRestaurant !== status.currentRestaurant) {
            if (status.currentRestaurant) {
                this.addLog(`服务状态：正在处理 ${status.currentRestaurant.name}`, 'info');
            }
        }

        // 更新最后状态
        this.lastServiceStatus = { ...status };
    }

    /**
     * 启动服务心跳检测
     */
    startServiceHeartbeat() {
        // 每60秒发送一次心跳检测，减少频率
        this.heartbeatInterval = setInterval(() => {
            if (this.socket && this.socket.connected) {
                this.socket.emit('ping');
                // 减少日志输出，避免刷屏
                if (Math.random() < 0.1) { // 只有10%的概率输出日志
                    this.addLog('服务状态：心跳检测正常', 'info');
                }
            } else {
                this.addLog('服务状态：心跳检测失败', 'warning');
            }
        }, 60000);

        // 监听心跳响应
        this.socket.on('pong', () => {
            // 心跳响应，不添加日志避免刷屏
        });
        
        console.log('💓 前端心跳检测已启动');
    }

    /**
     * 停止服务心跳检测
     */
    stopServiceHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
            this.addLog('💓 前端心跳检测已停止', 'info');
        }
    }

    /**
     * 处理任务完成事件
     * @param {Object} data - 任务完成数据
     */
    handleTaskCompletion(data) {
        // 更新状态为已完成
        this.currentStatus.isRunning = false;
        this.currentStatus.isPaused = false;
        
        // 更新进度为100%
        this.currentStatus.progress = 100;
        
        // 更新餐馆进度状态
        if (data.restaurantProgress) {
            this.currentStatus.restaurantProgress = data.restaurantProgress;
        }
        
        // 更新统计信息
        if (data.stats) {
            this.currentStatus.totalRestaurants = data.stats.totalRestaurants || 0;
            this.currentStatus.completedRestaurants = data.stats.completedRestaurants || 0;
            this.currentStatus.failedRestaurants = data.stats.failedRestaurants || 0;
            this.currentStatus.totalImages = data.stats.totalImages || 0;
            this.currentStatus.downloadedImages = data.stats.downloadedImages || 0;
            this.currentStatus.failedImages = data.stats.failedImages || 0;
        }
        
        // 更新UI状态
        this.updateStatusUI();
        
        // 停止前端心跳检测
        this.stopServiceHeartbeat();
        
        this.addLog('📊 任务状态已更新为完成', 'info');
    }

    /**
     * 处理最终任务完成事件
     * @param {Object} data - 最终任务完成数据
     */
    handleFinalTaskCompletion(data) {
        // 调用任务完成处理
        this.handleTaskCompletion(data);
        
        // 添加最终完成日志
        this.addLog('🎊 批量下载任务全部完成！', 'success');
        
        // 显示最终统计信息
        if (data.stats) {
            const duration = data.stats.endTime ? 
                new Date(data.stats.endTime) - new Date(data.stats.startTime) : 0;
            const durationMinutes = Math.round(duration / 60000);
            
            this.addLog('📈 最终统计信息:', 'info');
            this.addLog(`   - 总餐馆数: ${data.stats.totalRestaurants}`, 'info');
            this.addLog(`   - 成功: ${data.stats.completedRestaurants}`, 'info');
            this.addLog(`   - 失败: ${data.stats.failedRestaurants}`, 'info');
            this.addLog(`   - 总图片数: ${data.stats.totalImages}`, 'info');
            this.addLog(`   - 下载成功: ${data.stats.downloadedImages}`, 'info');
            this.addLog(`   - 下载失败: ${data.stats.failedImages}`, 'info');
            this.addLog(`   - 耗时: ${durationMinutes} 分钟`, 'info');
        }
        
        // 确保前端状态完全更新
        this.updateStatusUI();
    }

    /**
     * 切换AI配置显示
     */
    toggleAiConfig() {
        const aiEnabled = document.getElementById('aiEnabled').checked;
        const aiConfigArea = document.getElementById('aiConfigArea');
        
        if (aiEnabled) {
            aiConfigArea.style.display = 'block';
        } else {
            aiConfigArea.style.display = 'none';
        }
    }

    /**
     * 测试AI连接
     */
    async testAiConnection() {
        const testBtn = document.getElementById('testAiBtn');
        const originalText = testBtn.innerHTML;
        
        try {
            testBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>测试中...';
            testBtn.disabled = true;
            
            const aiConfig = this.getAiConfig();
            if (!aiConfig.apiKey) {
                throw new Error('请先输入GLM API密钥');
            }
            
            const response = await fetch('/api/ai/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(aiConfig)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.addLog('✅ AI连接测试成功', 'success');
                this.showAlert('AI连接测试成功！', 'success');
            } else {
                throw new Error(result.message || 'AI连接测试失败');
            }
            
        } catch (error) {
            this.addLog(`❌ AI连接测试失败: ${error.message}`, 'error');
            this.showAlert(`AI连接测试失败: ${error.message}`, 'error');
        } finally {
            testBtn.innerHTML = originalText;
            testBtn.disabled = false;
        }
    }

    /**
     * 获取AI配置
     * @returns {Object} AI配置对象
     */
    getAiConfig() {
        return {
            enabled: true,
            apiKey: '3134eeac071543cda4d2a9f7a82a38af.Uz7CREy8nd3HVMC2',
            model: 'glm-4-flash',
            analyzeImages: true,
            generateDescription: true,
            saveAnalysis: true,
            generateReview: true, // 新增：生成评语功能
            reviewPrompt: `# 角色
你是一位普通的美食爱好者，不是专业的博主。你写评价的目的是为了客观记录自己的用餐感受，并给其他食客提供真实的参考。你的语言风格朴实、真诚，会注重描述事实和细节，而不是堆砌形容词。

# 任务
根据用户提供的店家信息，创作一篇约300字的、风格真实的五星好评笔记。评价应听起来像一个细心的普通顾客写的，可以有褒奖，但要说出具体好在哪里。

# 风格与要求
1.  **语气自然，避免夸张**:
    * **核心要求**：完全避免使用"YYDS"、"绝绝子"、"好吃到哭"这类过于夸张的网络热词。
    * 请使用更生活化的正面词汇，例如："味道不错"、"印象挺深"、"确实可以"、"值得一试"、"没有踩雷"、"比预想的好"。

2.  **描述具体，少用形容词**:
    * 不要只说"好吃"，要说出"怎么个好吃法"。
    * **鼓励的描述方式**：多描述口感、食材和做法带来的感受。例如，用"鱼肉很嫩，筷子一夹就下来了，而且没什么刺"来代替"鱼肉入口即化"；用"酱汁是咸甜口的，很下饭"来代替"酱汁浓郁美味"。

3.  **内容有侧重，而非全部吹捧**:
    * 可以重点夸一两道最出彩的菜，其他菜品可以用"也还不错"、"中规中矩"等词语带过，这样更显真实。
    * 可以在夸赞菜品的同时，提及一些中性的细节，如"店里人挺多的，饭点可能要等位"、"价格不算便宜，但用料确实不错"等，让评价更立体。

4.  **输出格式要求**:
    * **重要**：直接输出评语内容，不要包含"标题:"、"正文:"、"结尾标签:"等格式标识词。
    * **标题**: 简单直接，可以加上Emoji，但不要过于浮夸。
    * **正文**: 先说整体感受，再分点说几道菜，最后简单总结。
    * **结尾标签**: 必须包含以下活动标签：#创作者赏金计划 #0元玩转这座城 #城市向导官# 优质创作者赏金计划，然后加上店家关键词。

5.  **避免重复语句**:
    * **严格禁止**使用以下固定语句："店里人挺多的，饭点可能要等位，价格不算便宜，但用料确实不错"。
    * 每次生成评语时，必须使用完全不同的表达方式和词汇。
    * 可以变化的中性描述：如"环境不错"、"服务态度好"、"性价比还可以"、"值得推荐"、"位置方便"、"装修有特色"、"服务周到"等。
    * 如果必须提及类似内容，请用完全不同的表达方式，如"人气很旺"、"环境舒适"、"价格合理"、"食材新鲜"等。

6.  **结合特色菜信息**:
    * 如果提供了店家的特色菜信息，要结合图片分析结果，重点描述这些特色菜。
    * 将网上查到的特色菜与图片中看到的菜品相结合，写出更真实的评价。

# 输出要求
请直接输出评语内容，格式如下：

[标题内容]

[正文内容]

[结尾标签内容]

不要包含"标题:"、"正文:"、"结尾标签:"等标识词，直接输出纯净的评语内容。`
        };
    }

    /**
     * 设置AI配置
     * @param {Object} config AI配置对象
     */
    setAiConfig(config) {
        if (config.enabled !== undefined) {
            document.getElementById('aiEnabled').checked = config.enabled;
            this.toggleAiConfig();
        }
        if (config.apiKey !== undefined) {
            document.getElementById('aiApiKey').value = config.apiKey;
        }
        if (config.model !== undefined) {
            document.getElementById('aiModel').value = config.model;
        }
        if (config.analyzeImages !== undefined) {
            document.getElementById('aiAnalyzeImages').checked = config.analyzeImages;
        }
        if (config.generateDescription !== undefined) {
            document.getElementById('aiGenerateDescription').checked = config.generateDescription;
        }
        if (config.saveAnalysis !== undefined) {
            document.getElementById('aiSaveAnalysis').checked = config.saveAnalysis;
        }
    }

    /**
     * 显示警告信息
     * @param {string} message 消息内容
     * @param {string} type 消息类型
     */
    showAlert(message, type = 'info') {
        // 创建警告框
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // 插入到页面顶部
        const container = document.querySelector('.container');
        container.insertBefore(alertDiv, container.firstChild);
        
        // 3秒后自动消失
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }
}

// 初始化应用
const app = new XiaohongshuDownloaderApp();
