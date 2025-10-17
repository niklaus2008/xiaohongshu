/**
 * 改进的小红书爬虫 - 集成智能登录
 * 自动处理Cookie验证和登录，避免重复扫码
 */

const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');
const { EnhancedCookieManager } = require('./enhanced-cookie-manager');

class ImprovedXiaohongshuScraper extends XiaohongshuScraper {
    constructor(options = {}) {
        super(options);
        this.cookieManager = new EnhancedCookieManager({
            cookieFile: options.cookieFile || './cookies.json',
            backupFile: options.backupFile || './cookies-backup.json'
        });
    }

    /**
     * 智能搜索和下载
     */
    async smartSearchAndDownload(restaurantName, location) {
        try {
            console.log(`🔍 开始智能搜索: ${restaurantName} (${location})`);
            
            // 1. 智能Cookie管理
            console.log('🍪 开始智能Cookie管理...');
            const cookieResult = await this.cookieManager.manageCookies();
            
            if (!cookieResult.success) {
                console.log('❌ Cookie管理失败，无法继续');
                return {
                    success: false,
                    error: 'Cookie管理失败',
                    restaurantName,
                    location
                };
            }
            
            console.log('✅ Cookie管理成功，开始搜索...');
            
            // 2. 使用有效的浏览器上下文
            const { browser, context, page } = await this.cookieManager.getValidContext();
            this.browser = browser;
            this.page = page;
            
            // 3. 执行搜索
            const searchKeyword = `${restaurantName} ${location}`;
            console.log(`📝 搜索关键词: ${searchKeyword}`);
            
            // 构建搜索URL
            const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(searchKeyword)}&type=51`;
            console.log(`🔗 搜索URL: ${searchUrl}`);
            
            await this.page.goto(searchUrl, { 
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            await this.page.waitForTimeout(5000);
            
            // 4. 检查搜索页面状态
            const searchStatus = await this.checkSearchPageStatus();
            if (!searchStatus.hasContent) {
                console.log('⚠️ 搜索页面无内容，尝试其他策略...');
                
                // 尝试点击图文标签
                await this.clickImageTab();
                await this.page.waitForTimeout(3000);
                
                // 重新检查
                const newStatus = await this.checkSearchPageStatus();
                if (!newStatus.hasContent) {
                    console.log('❌ 搜索页面仍无内容');
                    return {
                        success: false,
                        error: '搜索页面无内容',
                        restaurantName,
                        location
                    };
                }
            }
            
            // 5. 提取图片
            console.log('📸 开始提取图片...');
            const imageUrls = await this.extractImageUrls();
            console.log(`📸 找到 ${imageUrls.length} 张图片`);
            
            if (imageUrls.length === 0) {
                console.log('❌ 未找到任何图片');
                return {
                    success: false,
                    error: '未找到图片',
                    restaurantName,
                    location
                };
            }
            
            // 6. 下载图片
            console.log('⬇️ 开始下载图片...');
            const downloadResults = await this.downloadImages(imageUrls, restaurantName, location);
            
            return {
                success: true,
                restaurantName,
                location,
                totalFound: imageUrls.length,
                downloadedCount: downloadResults.downloadedCount,
                failedCount: downloadResults.failedCount,
                errors: this.errors
            };
            
        } catch (error) {
            console.error('❌ 智能搜索和下载过程中发生错误:', error.message);
            this.errors.push({
                type: 'smart_search_error',
                message: error.message,
                timestamp: new Date().toISOString()
            });
            
            return {
                success: false,
                restaurantName,
                location,
                error: error.message,
                errors: this.errors
            };
        }
    }

    /**
     * 检查搜索页面状态
     */
    async checkSearchPageStatus() {
        try {
            const status = await this.page.evaluate(() => {
                return {
                    url: window.location.href,
                    title: document.title,
                    hasContent: document.querySelectorAll('.note-item, .feed-item, .content-item, .note-card, .search-item, .result-item, article, .card').length,
                    hasImages: document.querySelectorAll('img[src*="http"]').length,
                    hasLoginPrompt: document.body ? document.body.innerText.includes('登录后查看搜索结果') : false,
                    bodyText: document.body ? document.body.innerText.substring(0, 500) : ''
                };
            });
            
            console.log('📄 搜索页面状态:', status);
            return status;
            
        } catch (error) {
            console.error('❌ 检查搜索页面状态时出错:', error.message);
            return { hasContent: false, hasImages: 0, hasLoginPrompt: false };
        }
    }

    /**
     * 点击图文标签
     */
    async clickImageTab() {
        try {
            console.log('📸 尝试点击"图文"标签...');
            
            const imageTabSelectors = [
                'text=图文',
                '[data-testid*="image"]',
                '.tab:has-text("图文")',
                'button:has-text("图文")',
                'div:has-text("图文")'
            ];
            
            for (const selector of imageTabSelectors) {
                try {
                    const element = await this.page.waitForSelector(selector, { timeout: 3000 });
                    if (element) {
                        await element.click();
                        console.log(`✅ 成功点击图文标签: ${selector}`);
                        return true;
                    }
                } catch (error) {
                    continue;
                }
            }
            
            console.log('⚠️ 未找到图文标签');
            return false;
            
        } catch (error) {
            console.error('❌ 点击图文标签失败:', error.message);
            return false;
        }
    }

    /**
     * 关闭浏览器
     */
    async close() {
        try {
            if (this.cookieManager) {
                await this.cookieManager.close();
            }
            if (this.browser) {
                await this.browser.close();
                console.log('🔒 浏览器已关闭');
            }
        } catch (error) {
            console.error('❌ 关闭浏览器时出错:', error.message);
        }
    }
}

// 使用示例
async function testImprovedScraper() {
    console.log('🚀 开始测试改进的小红书爬虫...\n');
    
    const scraper = new ImprovedXiaohongshuScraper({
        downloadPath: '/Users/liuqiang/code/toolkit/xiaohongshu/improved-downloads',
        maxImages: 5,
        headless: false,
        delay: 3000
    });

    try {
        // 测试搜索和下载
        const result = await scraper.smartSearchAndDownload('海底捞', '北京朝阳区');
        
        if (result.success) {
            console.log('\n✅ 智能搜索和下载成功！');
            console.log(`📊 下载统计: ${result.downloadedCount} 成功, ${result.failedCount} 失败`);
            console.log(`📸 总共找到: ${result.totalFound} 张图片`);
        } else {
            console.log('\n❌ 智能搜索和下载失败');
            console.log(`错误: ${result.error}`);
        }
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
    } finally {
        await scraper.close();
    }
}

// 如果直接运行此文件
if (require.main === module) {
    testImprovedScraper();
}

module.exports = { ImprovedXiaohongshuScraper };