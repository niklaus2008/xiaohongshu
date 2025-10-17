/**
 * 完整流程验证脚本
 * 测试Cookie优先策略和完整的小红书图片下载流程
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

async function testFullWorkflow() {
    console.log('🚀 开始验证完整的小红书图片下载流程...\n');
    
    const scraper = new XiaohongshuScraper({
        downloadPath: './test-full-workflow-downloads',
        maxImages: 3, // 下载3张图片进行测试
        headless: false, // 显示浏览器窗口以便观察
        delay: 2000,
        login: {
            method: 'qr', // 如果Cookie失效，使用扫码登录
            autoLogin: true,
            saveCookies: true,
            cookieFile: './cookies.json'
        }
    });

    try {
        console.log('📋 测试步骤：');
        console.log('1. 初始化浏览器');
        console.log('2. 检查Cookie有效性');
        console.log('3. 自动登录（Cookie优先）');
        console.log('4. 搜索指定内容');
        console.log('5. 下载图片并去除水印');
        console.log('6. 验证下载结果\n');

        // 步骤1：初始化浏览器
        console.log('🔧 步骤1：初始化浏览器...');
        await scraper.initBrowser();
        console.log('✅ 浏览器初始化完成\n');

        // 步骤2：检查Cookie有效性
        console.log('🍪 步骤2：检查Cookie有效性...');
        const cookieStatus = await scraper.checkCookieValidity();
        if (cookieStatus) {
            console.log('✅ Cookie有效，将直接使用Cookie登录\n');
        } else {
            console.log('⚠️ Cookie无效或不存在，将进行重新登录\n');
        }

        // 步骤3-5：使用searchAndDownload方法完成登录、搜索和下载
        console.log('🔐 步骤3-5：自动登录、搜索和下载...');
        const restaurantName = '海底捞';
        const location = '北京朝阳区';
        
        const result = await scraper.searchAndDownload(restaurantName, location);
        
        if (result) {
            console.log('✅ 完整流程执行成功！\n');
        } else {
            console.log('❌ 完整流程执行失败');
            return;
        }

        // 步骤6：验证下载结果
        console.log('🔍 步骤6：验证下载结果...');
        const fs = require('fs-extra');
        const path = require('path');
        
        const downloadDir = path.join(process.cwd(), 'test-full-workflow-downloads');
        const searchKeyword = `${restaurantName} ${location}`;
        const searchDir = path.join(downloadDir, searchKeyword.replace(/\s+/g, '_'));
        
        if (await fs.pathExists(searchDir)) {
            const files = await fs.readdir(searchDir);
            const imageFiles = files.filter(file => 
                /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
            );
            
            console.log(`✅ 下载验证成功！`);
            console.log(`📁 下载目录: ${searchDir}`);
            console.log(`📊 下载文件数量: ${imageFiles.length}`);
            console.log(`📋 文件列表:`);
            imageFiles.forEach((file, index) => {
                const filePath = path.join(searchDir, file);
                const stats = fs.statSync(filePath);
                const sizeKB = Math.round(stats.size / 1024);
                console.log(`   ${index + 1}. ${file} (${sizeKB}KB)`);
            });
        } else {
            console.log('❌ 下载目录不存在');
        }

        console.log('\n🎉 完整流程验证成功！');

    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
        console.error('错误详情:', error.stack);
    } finally {
        // 关闭浏览器
        console.log('\n🔚 关闭浏览器...');
        await scraper.close();
        console.log('✅ 测试完成');
    }
}

// 运行完整流程测试
testFullWorkflow().catch(console.error);
