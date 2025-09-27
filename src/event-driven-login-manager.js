/**
 * 事件驱动登录管理器
 * 解决重复登录窗口问题，提供状态管理和事件通知
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const EventEmitter = require('events');

/**
 * 事件驱动登录管理器
 * 提供状态管理、事件通知和防重复机制
 */
class EventDrivenLoginManager extends EventEmitter {
    constructor() {
        super();
        
        // 登录状态管理
        this.state = {
            isLoggedIn: false,
            isWaitingForLogin: false,
            isLoginWindowOpen: false,
            loginPromise: null,
            loginAttempts: 0,
            maxLoginAttempts: 3
        };
        
        // 事件类型定义
        this.EVENTS = {
            LOGIN_STARTED: 'loginStarted',
            LOGIN_SUCCESS: 'loginSuccess', 
            LOGIN_FAILED: 'loginFailed',
            LOGIN_WINDOW_OPENED: 'loginWindowOpened',
            LOGIN_WINDOW_CLOSED: 'loginWindowClosed',
            STATE_CHANGED: 'stateChanged'
        };
        
        console.log('🎯 事件驱动登录管理器已初始化');
    }
    
    /**
     * 获取当前状态
     * @returns {Object} 当前登录状态
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * 更新状态并触发事件
     * @param {Object} newState 新状态
     */
    updateState(newState) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };
        
        console.log('📊 状态更新:', {
            old: oldState,
            new: this.state,
            changes: Object.keys(newState)
        });
        
        this.emit(this.EVENTS.STATE_CHANGED, {
            oldState,
            newState: this.state,
            changes: newState
        });
    }
    
    /**
     * 开始登录流程
     * @param {Function} loginFunction 登录函数
     * @returns {Promise} 登录结果
     */
    async startLogin(loginFunction) {
        console.log('🚀 [事件驱动登录管理器] 开始登录流程...');
        console.log('📊 [事件驱动登录管理器] 当前状态:', this.getState());
        console.log('🔍 [事件驱动登录管理器] 详细状态检查:');
        console.log('  - isLoggedIn:', this.state.isLoggedIn);
        console.log('  - isWaitingForLogin:', this.state.isWaitingForLogin);
        console.log('  - isLoginWindowOpen:', this.state.isLoginWindowOpen);
        console.log('  - loginAttempts:', this.state.loginAttempts);
        console.log('  - maxLoginAttempts:', this.state.maxLoginAttempts);
        
        // 防重复登录检查
        if (this.state.isWaitingForLogin) {
            console.log('🛡️ [事件驱动登录管理器] 防重复：已在等待登录，返回现有Promise');
            console.log('📊 [事件驱动登录管理器] 现有Promise状态:', this.state.loginPromise ? '存在' : '不存在');
            console.log('🔄 [事件驱动登录管理器] 保持现有登录状态，不创建新的登录窗口');
            return this.state.loginPromise;
        }
        
        if (this.state.isLoginWindowOpen) {
            console.log('🛡️ [事件驱动登录管理器] 防重复：登录窗口已打开，返回现有Promise');
            console.log('📊 [事件驱动登录管理器] 现有Promise状态:', this.state.loginPromise ? '存在' : '不存在');
            console.log('🔄 [事件驱动登录管理器] 保持现有登录窗口，不创建新的登录窗口');
            return this.state.loginPromise;
        }
        
        // 检查登录尝试次数
        if (this.state.loginAttempts >= this.state.maxLoginAttempts) {
            const error = new Error('登录尝试次数超限');
            this.emit(this.EVENTS.LOGIN_FAILED, error);
            throw error;
        }
        
        // 更新状态
        this.updateState({
            isWaitingForLogin: true,
            loginAttempts: this.state.loginAttempts + 1
        });
        
        // 触发登录开始事件
        this.emit(this.EVENTS.LOGIN_STARTED, {
            attempt: this.state.loginAttempts,
            maxAttempts: this.state.maxLoginAttempts
        });
        
        try {
            // 创建登录Promise
            this.state.loginPromise = this.performLogin(loginFunction);
            
            // 等待登录完成
            const result = await this.state.loginPromise;
            
            // 登录成功
            this.updateState({
                isLoggedIn: true,
                isWaitingForLogin: false,
                isLoginWindowOpen: false,
                loginPromise: null
            });
            
            this.emit(this.EVENTS.LOGIN_SUCCESS, result);
            console.log('✅ 登录成功！');
            
            return result;
            
        } catch (error) {
            // 登录失败
            this.updateState({
                isWaitingForLogin: false,
                isLoginWindowOpen: false,
                loginPromise: null
            });
            
            this.emit(this.EVENTS.LOGIN_FAILED, error);
            console.error('❌ 登录失败:', error.message);
            
            throw error;
        }
    }
    
    /**
     * 执行登录
     * @param {Function} loginFunction 登录函数
     * @returns {Promise} 登录结果
     */
    async performLogin(loginFunction) {
        console.log('🔐 执行登录操作...');
        
        try {
            // 调用实际的登录函数
            const result = await loginFunction();
            
            if (result && result.success) {
                return result;
            } else {
                throw new Error('登录函数返回失败结果');
            }
            
        } catch (error) {
            console.error('❌ 登录执行失败:', error.message);
            throw error;
        }
    }
    
    /**
     * 打开登录窗口
     * @param {Function} openWindowFunction 打开窗口函数
     * @returns {Promise} 窗口打开结果
     */
    async openLoginWindow(openWindowFunction) {
        console.log('🪟 [事件驱动登录管理器] 打开登录窗口...');
        console.log('🔍 [事件驱动登录管理器] 窗口打开前状态检查:');
        console.log('  - isLoginWindowOpen:', this.state.isLoginWindowOpen);
        console.log('  - isWaitingForLogin:', this.state.isWaitingForLogin);
        console.log('  - isLoggedIn:', this.state.isLoggedIn);
        
        // 检查是否已有窗口打开
        if (this.state.isLoginWindowOpen) {
            console.log('🛡️ [事件驱动登录管理器] 防重复：登录窗口已打开');
            return { success: true, message: '登录窗口已打开' };
        }
        
        try {
            // 更新状态
            this.updateState({ isLoginWindowOpen: true });
            
            // 触发窗口打开事件
            this.emit(this.EVENTS.LOGIN_WINDOW_OPENED);
            
            // 调用打开窗口函数
            const result = await openWindowFunction();
            
            console.log('✅ 登录窗口已打开');
            return result;
            
        } catch (error) {
            // 窗口打开失败，重置状态
            this.updateState({ isLoginWindowOpen: false });
            console.error('❌ 打开登录窗口失败:', error.message);
            throw error;
        }
    }
    
    /**
     * 关闭登录窗口
     */
    closeLoginWindow() {
        console.log('🪟 关闭登录窗口...');
        
        this.updateState({ 
            isLoginWindowOpen: false,
            isWaitingForLogin: false
        });
        
        this.emit(this.EVENTS.LOGIN_WINDOW_CLOSED);
        console.log('✅ 登录窗口已关闭');
    }
    
    /**
     * 重置登录状态
     */
    resetLoginState() {
        console.log('🔄 重置登录状态...');
        
        this.updateState({
            isLoggedIn: false,
            isWaitingForLogin: false,
            isLoginWindowOpen: false,
            loginPromise: null,
            loginAttempts: 0
        });
        
        console.log('✅ 登录状态已重置');
    }
    
    /**
     * 检查是否可以开始新的登录
     * @returns {boolean} 是否可以开始登录
     */
    canStartLogin() {
        return !this.state.isWaitingForLogin && 
               !this.state.isLoginWindowOpen && 
               this.state.loginAttempts < this.state.maxLoginAttempts;
    }
    
    /**
     * 获取登录状态摘要
     * @returns {Object} 状态摘要
     */
    getStatusSummary() {
        return {
            canLogin: this.canStartLogin(),
            isLoggedIn: this.state.isLoggedIn,
            isWaiting: this.state.isWaitingForLogin,
            windowOpen: this.state.isLoginWindowOpen,
            attempts: this.state.loginAttempts,
            maxAttempts: this.state.maxLoginAttempts
        };
    }
}

module.exports = EventDrivenLoginManager;
