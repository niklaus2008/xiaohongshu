#!/bin/bash

# 小红书餐馆图片下载工具安装脚本
# 作者: AI Assistant
# 版本: 1.0.0

echo "🚀 开始安装小红书餐馆图片下载工具..."

# 检查Node.js是否已安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js (版本 >= 16.0.0)"
    echo "   下载地址: https://nodejs.org/"
    exit 1
fi

# 检查Node.js版本
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="16.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js 版本过低，当前版本: $NODE_VERSION，需要版本 >= $REQUIRED_VERSION"
    exit 1
fi

echo "✅ Node.js 版本检查通过: $NODE_VERSION"

# 检查npm是否已安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

echo "✅ npm 检查通过: $(npm -v)"

# 安装依赖
echo "📦 正在安装项目依赖..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ 依赖安装成功"
else
    echo "❌ 依赖安装失败"
    exit 1
fi

# 安装Playwright浏览器
echo "🌐 正在安装 Playwright 浏览器..."
npx playwright install chromium

if [ $? -eq 0 ]; then
    echo "✅ Playwright 浏览器安装成功"
else
    echo "❌ Playwright 浏览器安装失败"
    exit 1
fi

# 创建下载目录
echo "📁 创建下载目录..."
mkdir -p downloads
echo "✅ 下载目录创建成功"

# 运行测试
echo "🧪 运行基本测试..."
npm test

if [ $? -eq 0 ]; then
    echo "✅ 测试通过"
else
    echo "⚠️ 测试失败，但安装已完成"
fi

echo ""
echo "🎉 安装完成！"
echo ""
echo "📖 使用方法:"
echo "   npm start          # 运行基本示例"
echo "   npm test           # 运行测试"
echo "   node example.js    # 运行示例文件"
echo ""
echo "📚 更多信息请查看 README.md 文件"
echo ""
echo "⚠️ 注意事项:"
echo "   1. 请遵守小红书的服务条款"
echo "   2. 仅用于个人学习和研究目的"
echo "   3. 建议设置适当的请求间隔"
echo ""
