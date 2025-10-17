/**
 * 测试餐馆特色菜研究功能
 */

const RestaurantResearcher = require('./src/restaurant-research');

async function testRestaurantResearch() {
    console.log('🧪 开始测试餐馆特色菜研究功能...\n');

    try {
        const researcher = new RestaurantResearcher();

        // 测试单个餐馆研究
        console.log('📝 测试单个餐馆研究...');
        const singleResult = await researcher.getRestaurantSpecialties('海底捞', '北京朝阳区');
        console.log('✅ 单个餐馆研究结果:', JSON.stringify(singleResult, null, 2));

        console.log('\n📝 测试批量餐馆研究...');
        const testRestaurants = [
            { name: '海底捞', location: '北京朝阳区' },
            { name: '全聚德', location: '北京东城区' },
            { name: '小肥羊', location: '上海徐汇区' },
            { name: '川味轩', location: '成都锦江区' },
            { name: '粤菜馆', location: '广州天河区' }
        ];

        const batchResults = await researcher.batchResearchRestaurants(testRestaurants);
        console.log('✅ 批量研究结果:', JSON.stringify(batchResults, null, 2));

        console.log('\n📝 测试研究功能...');
        const testResult = await researcher.testResearch();
        console.log('✅ 功能测试结果:', JSON.stringify(testResult, null, 2));

        console.log('\n🎉 餐馆特色菜研究功能测试完成！');

    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error(error.stack);
    }
}

// 运行测试
if (require.main === module) {
    testRestaurantResearch();
}

module.exports = testRestaurantResearch;
