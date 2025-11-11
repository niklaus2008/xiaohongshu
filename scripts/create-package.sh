#!/bin/bash
# 创建扩展打包文件
# 用于将项目打包到新电脑上使用

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取当前日期时间
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
PACKAGE_NAME="xiaohongshu-extension-${TIMESTAMP}.zip"

echo -e "${GREEN}📦 开始打包扩展...${NC}"
echo -e "${YELLOW}排除目录: node_modules, logs, temp, browser-data, ai-analysis, .git${NC}"
echo ""

# 检查必要文件是否存在
REQUIRED_FILES=("extension" "src" "public" "scripts" "package.json")
MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -e "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -ne 0 ]; then
    echo -e "${RED}❌ 错误: 以下必要文件/目录不存在:${NC}"
    for file in "${MISSING_FILES[@]}"; do
        echo -e "${RED}   - $file${NC}"
    done
    echo ""
    echo -e "${YELLOW}请确保在项目根目录下运行此脚本${NC}"
    exit 1
fi

# 创建打包文件
echo -e "${GREEN}正在创建打包文件: ${PACKAGE_NAME}${NC}"

zip -r "$PACKAGE_NAME" \
  extension/ src/ public/ scripts/ config/ package.json package-lock.json README.md \
  -x "node_modules/*" \
  -x "logs/*" \
  -x "temp/*" \
  -x "browser-data/*" \
  -x "ai-analysis/*" \
  -x ".git/*" \
  -x "*.log" \
  -x ".DS_Store" \
  > /dev/null 2>&1

if [ $? -eq 0 ]; then
    FILE_SIZE=$(du -h "$PACKAGE_NAME" | cut -f1)
    echo ""
    echo -e "${GREEN}✅ 打包完成!${NC}"
    echo -e "${GREEN}📦 文件名: ${PACKAGE_NAME}${NC}"
    echo -e "${GREEN}📊 文件大小: ${FILE_SIZE}${NC}"
    echo ""
    echo -e "${YELLOW}📝 下一步:${NC}"
    echo -e "1. 将 ${PACKAGE_NAME} 传输到新电脑"
    echo -e "2. 解压文件"
    echo -e "3. 在新电脑上运行: npm install"
    echo -e "4. 启动Web服务器: npm run start:web:background"
    echo -e "5. 在Chrome中加载 extension 目录"
else
    echo -e "${RED}❌ 打包失败!${NC}"
    exit 1
fi

