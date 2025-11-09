#!/bin/bash

# 登录修复测试脚本
# 用于验证登录后任务继续执行的修复是否生效

echo "🧪 登录修复测试脚本"
echo "===================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 步骤1：检查是否有旧服务器运行
echo -e "${YELLOW}步骤1: 检查旧服务器...${NC}"
if [ -f ".web-server.pid" ]; then
    echo "发现旧服务器，正在停止..."
    npm run stop:web
    sleep 2
else
    echo "没有运行中的服务器"
fi
echo ""

# 步骤2：删除旧的Cookie（强制重新登录）
echo -e "${YELLOW}步骤2: 清理旧的登录信息...${NC}"
if [ -f "cookies.json" ]; then
    echo "删除 cookies.json 以强制重新登录"
    rm -f cookies.json
    echo -e "${GREEN}✅ 已删除旧Cookie${NC}"
else
    echo "没有找到旧Cookie"
fi
echo ""

# 步骤3：检查启动器服务
echo -e "${YELLOW}步骤3: 检查启动器服务...${NC}"
if curl -s http://localhost:3001/status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 启动器服务已运行${NC}"
else
    echo -e "${YELLOW}⚠️  启动器服务未运行${NC}"
    echo "请在另一个终端运行: npm run start:launcher"
    echo ""
    read -p "启动器服务启动后，按回车继续..."
fi
echo ""

# 步骤4：启动Web服务器
echo -e "${YELLOW}步骤4: 启动Web服务器...${NC}"
npm run start:web:background
sleep 3

# 检查服务器状态
if curl -s http://localhost:3000/api/status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Web服务器启动成功${NC}"
else
    echo -e "${RED}❌ Web服务器启动失败${NC}"
    exit 1
fi
echo ""

# 步骤5：提示用户进行手动测试
echo -e "${GREEN}===================="
echo "✅ 环境准备完成！"
echo "====================${NC}"
echo ""
echo "📋 下一步操作："
echo ""
echo "1. 打开浏览器访问: http://localhost:3000"
echo ""
echo "2. 添加测试餐馆（或使用已有配置）："
echo "   - 餐馆名称: 测试餐馆"
echo "   - 城市: 北京"
echo "   - 下载数量: 5张"
echo ""
echo "3. 点击 '开始下载' 按钮"
echo ""
echo "4. 在打开的Chromium浏览器中扫码登录"
echo ""
echo "5. 观察Web界面的日志输出"
echo ""
echo -e "${YELLOW}预期结果：${NC}"
echo "  ✅ Chromium浏览器自动打开"
echo "  ✅ 显示: 📱 请在Chromium浏览器中扫码登录..."
echo "  ✅ 扫码后显示: ✅ 登录成功！"
echo "  ✅ 显示: 🔄 正在应用登录状态..."
echo "  ✅ 显示: 🎉 登录完成！即将开始下载任务..."
echo "  ✅ 可以看到下载进度"
echo ""
echo -e "${GREEN}如果看到以上所有提示，说明修复成功！${NC}"
echo ""
echo "📝 查看日志: tail -f logs/web-server.log"
echo "🛑 停止服务器: npm run stop:web"
echo ""

