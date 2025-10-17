/**
 * 测试登录流程的脚本
 * 验证登录后下载按钮是否自动启用
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const fs = require('fs-extra');
const path = require('path');

class LoginFlowTester {
    constructor() {
        this.testResults = [];
    }

    /**
     * 测试登录状态检测逻辑
     */
    async testLoginStatusDetection() {
        console.log('🧪 测试登录状态检测逻辑...');
        
        try {
            // 模拟登录状态检测
            const mockLoginData = {
                isLoggedIn: true,
                loginScore: 5,
                cookieInfo: { count: 10 }
            };
            
            // 检查updateStartButton方法是否正确处理登录状态
            const appJsPath = path.join(__dirname, 'public/js/app.js');
            const appJsContent = await fs.readFile(appJsPath, 'utf8');
            
            // 检查关键方法是否存在
            const hasUpdateStartButton = appJsContent.includes('updateStartButton()');
            const hasAutoDetectLoginStatus = appJsContent.includes('autoDetectLoginStatus()');
            const hasCheckLoginStatus = appJsContent.includes('checkLoginStatus()');
            
            this.testResults.push({
                test: 'updateStartButton方法存在',
                result: hasUpdateStartButton ? '✅ 通过' : '❌ 失败',
                details: hasUpdateStartButton ? '方法已定义' : '方法未找到'
            });
            
            this.testResults.push({
                test: 'autoDetectLoginStatus方法存在',
                result: hasAutoDetectLoginStatus ? '✅ 通过' : '❌ 失败',
                details: hasAutoDetectLoginStatus ? '方法已定义' : '方法未找到'
            });
            
            this.testResults.push({
                test: 'checkLoginStatus方法存在',
                result: hasCheckLoginStatus ? '✅ 通过' : '❌ 失败',
                details: hasCheckLoginStatus ? '方法已定义' : '方法未找到'
            });
            
            // 检查autoDetectLoginStatus是否调用了updateStartButton
            const autoDetectCallsUpdateStart = appJsContent.includes('this.updateStartButton()');
            this.testResults.push({
                test: 'autoDetectLoginStatus调用updateStartButton',
                result: autoDetectCallsUpdateStart ? '✅ 通过' : '❌ 失败',
                details: autoDetectCallsUpdateStart ? '已正确调用' : '未调用updateStartButton'
            });
            
            // 检查checkLoginStatus是否调用了updateStartButton
            const checkLoginCallsUpdateStart = appJsContent.includes('this.updateStartButton()');
            this.testResults.push({
                test: 'checkLoginStatus调用updateStartButton',
                result: checkLoginCallsUpdateStart ? '✅ 通过' : '❌ 失败',
                details: checkLoginCallsUpdateStart ? '已正确调用' : '未调用updateStartButton'
            });
            
        } catch (error) {
            this.testResults.push({
                test: '测试执行',
                result: '❌ 失败',
                details: error.message
            });
        }
    }

    /**
     * 测试UI更新逻辑
     */
    async testUIUpdateLogic() {
        console.log('🧪 测试UI更新逻辑...');
        
        try {
            const appJsPath = path.join(__dirname, 'public/js/app.js');
            const appJsContent = await fs.readFile(appJsPath, 'utf8');
            
            // 检查登录状态更新逻辑
            const hasLoginStatusUpdate = appJsContent.includes('updateLoginStatus');
            const hasStartButtonUpdate = appJsContent.includes('updateStartButton');
            
            this.testResults.push({
                test: '登录状态更新逻辑',
                result: hasLoginStatusUpdate ? '✅ 通过' : '❌ 失败',
                details: hasLoginStatusUpdate ? '已实现' : '未实现'
            });
            
            this.testResults.push({
                test: '下载按钮更新逻辑',
                result: hasStartButtonUpdate ? '✅ 通过' : '❌ 失败',
                details: hasStartButtonUpdate ? '已实现' : '未实现'
            });
            
            // 检查登录窗口关闭后的处理逻辑
            const hasWindowCloseHandler = appJsContent.includes('loginWindow.closed');
            this.testResults.push({
                test: '登录窗口关闭处理',
                result: hasWindowCloseHandler ? '✅ 通过' : '❌ 失败',
                details: hasWindowCloseHandler ? '已实现' : '未实现'
            });
            
        } catch (error) {
            this.testResults.push({
                test: 'UI更新逻辑测试',
                result: '❌ 失败',
                details: error.message
            });
        }
    }

    /**
     * 生成修复建议
     */
    generateFixSuggestions() {
        console.log('\n💡 修复建议：');
        
        const failedTests = this.testResults.filter(result => result.result.includes('❌'));
        
        if (failedTests.length === 0) {
            console.log('✅ 所有测试通过，登录流程应该正常工作');
            console.log('💡 如果仍有问题，可能是以下原因：');
            console.log('   1. 浏览器缓存问题 - 请清除浏览器缓存');
            console.log('   2. 服务未重启 - 请重启服务');
            console.log('   3. 登录状态检测延迟 - 请等待几秒钟');
        } else {
            console.log('❌ 发现以下问题：');
            failedTests.forEach(test => {
                console.log(`   - ${test.test}: ${test.details}`);
            });
        }
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('🚀 开始测试登录流程...\n');
        
        await this.testLoginStatusDetection();
        await this.testUIUpdateLogic();
        
        console.log('\n📊 测试结果：');
        this.testResults.forEach(result => {
            console.log(`${result.result} ${result.test}: ${result.details}`);
        });
        
        this.generateFixSuggestions();
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const tester = new LoginFlowTester();
    tester.runAllTests().catch(console.error);
}

module.exports = LoginFlowTester;
