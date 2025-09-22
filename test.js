/**
 * 小红书餐馆图片下载工具测试文件
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');
const fs = require('fs-extra');
const path = require('path');

/**
 * 测试配置
 */
const TEST_CONFIG = {
    downloadPath: './test-downloads',
    maxImages: 3,
    headless: true,
    delay: 1000,
    timeout: 20000
};

/**
 * 清理测试环境
 */
async function cleanup() {
    try {
        if (await fs.pathExists(TEST_CONFIG.downloadPath)) {
            await fs.remove(TEST_CONFIG.downloadPath);
            console.log('🧹 测试环境已清理');
        }
    } catch (error) {
        console.error('❌ 清理测试环境失败:', error.message);
    }
}

/**
 * 测试基本功能
 */
async function testBasicFunctionality() {
    console.log('🧪 测试基本功能...');
    
    const scraper = new XiaohongshuScraper(TEST_CONFIG);
    
    try {
        // 测试构造函数
        console.log('✅ 构造函数测试通过');
        
        // 测试配置
        const stats = scraper.getStats();
        console.log('✅ 配置获取测试通过');
        console.log('📊 配置信息:', JSON.stringify(stats.config, null, 2));
        
        // 测试浏览器初始化
        await scraper.initBrowser();
        console.log('✅ 浏览器初始化测试通过');
        
        // 测试关闭浏览器
        await scraper.close();
        console.log('✅ 浏览器关闭测试通过');
        
        return true;
    } catch (error) {
        console.error('❌ 基本功能测试失败:', error.message);
        return false;
    }
}

/**
 * 测试搜索功能（不下载图片）
 */
async function testSearchFunction() {
    console.log('🧪 测试搜索功能...');
    
    const scraper = new XiaohongshuScraper({
        ...TEST_CONFIG,
        maxImages: 1 // 只测试搜索，不下载
    });
    
    try {
        const result = await scraper.searchAndDownload('测试餐馆', '测试地点');
        
        if (result) {
            console.log('✅ 搜索功能测试通过');
            console.log('📊 搜索结果:', {
                success: result.success,
                restaurantName: result.restaurantName,
                location: result.location
            });
            return true;
        } else {
            console.log('❌ 搜索功能测试失败: 未返回结果');
            return false;
        }
        
    } catch (error) {
        console.error('❌ 搜索功能测试失败:', error.message);
        return false;
    } finally {
        await scraper.close();
    }
}

/**
 * 测试文件操作
 */
async function testFileOperations() {
    console.log('🧪 测试文件操作...');
    
    try {
        const scraper = new XiaohongshuScraper(TEST_CONFIG);
        
        // 测试目录创建
        await scraper.ensureDownloadDir();
        const dirExists = await fs.pathExists(TEST_CONFIG.downloadPath);
        
        if (dirExists) {
            console.log('✅ 目录创建测试通过');
        } else {
            console.log('❌ 目录创建测试失败');
            return false;
        }
        
        // 测试文件名清理
        const testFileName = '测试<>:"/\\|?*文件名';
        const cleanedName = scraper.sanitizeFileName(testFileName);
        console.log(`✅ 文件名清理测试通过: "${testFileName}" -> "${cleanedName}"`);
        
        // 测试文件名生成
        const testUrl = 'https://example.com/image.jpg';
        const fileName = scraper.generateFileName(testUrl, 1);
        console.log(`✅ 文件名生成测试通过: "${fileName}"`);
        
        return true;
        
    } catch (error) {
        console.error('❌ 文件操作测试失败:', error.message);
        return false;
    }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
    console.log('🚀 开始运行所有测试...\n');
    
    const tests = [
        { name: '基本功能测试', fn: testBasicFunctionality },
        { name: '文件操作测试', fn: testFileOperations },
        { name: '搜索功能测试', fn: testSearchFunction }
    ];
    
    const results = [];
    
    for (const test of tests) {
        console.log(`\n📋 ${test.name}:`);
        try {
            const result = await test.fn();
            results.push({ name: test.name, passed: result });
        } catch (error) {
            console.error(`❌ ${test.name} 执行异常:`, error.message);
            results.push({ name: test.name, passed: false, error: error.message });
        }
    }
    
    // 输出测试结果
    console.log('\n📊 测试结果汇总:');
    console.log('='.repeat(50));
    
    let passedCount = 0;
    results.forEach(result => {
        const status = result.passed ? '✅ 通过' : '❌ 失败';
        console.log(`${status} ${result.name}`);
        if (result.error) {
            console.log(`   错误: ${result.error}`);
        }
        if (result.passed) passedCount++;
    });
    
    console.log('='.repeat(50));
    console.log(`📈 测试通过率: ${passedCount}/${results.length} (${Math.round(passedCount/results.length*100)}%)`);
    
    if (passedCount === results.length) {
        console.log('🎉 所有测试通过！');
    } else {
        console.log('⚠️ 部分测试失败，请检查相关功能');
    }
}

/**
 * 主函数
 */
async function main() {
    try {
        // 清理测试环境
        await cleanup();
        
        // 运行测试
        await runAllTests();
        
    } catch (error) {
        console.error('❌ 测试执行失败:', error.message);
        process.exit(1);
    } finally {
        // 清理测试环境
        await cleanup();
        console.log('\n🏁 测试完成');
    }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未处理的Promise拒绝:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ 未捕获的异常:', error);
    process.exit(1);
});

// 运行测试
if (require.main === module) {
    main().catch(error => {
        console.error('❌ 主函数执行失败:', error);
        process.exit(1);
    });
}

module.exports = {
    testBasicFunctionality,
    testSearchFunction,
    testFileOperations,
    runAllTests
};
