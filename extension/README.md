# 小红书餐馆图片下载工具 - Chrome插件版

## 项目简介

这是基于Chrome Extension API开发的小红书餐馆图片下载工具，是原Node.js版本的Chrome插件改造版本。可以在浏览器中直接使用，无需安装Node.js环境。

## 功能特点

- ✅ **浏览器内运行**：无需Node.js，直接在Chrome浏览器中使用
- ✅ **批量下载**：支持批量配置和下载多个餐馆的图片
- ✅ **智能水印去除**：自动去除小红书图片水印
- ✅ **AI智能分析**：集成AI服务，智能分析图片内容并生成评语
- ✅ **配置管理**：支持配置保存、加载、导入导出
- ✅ **实时进度**：实时显示下载进度和日志
- ✅ **登录管理**：自动检测和管理登录状态

## 安装方法

### 方法一：开发者模式安装（推荐用于开发测试）

1. 打开Chrome浏览器，访问 `chrome://extensions/`
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `extension` 目录
5. 插件安装完成

### 方法二：打包安装

1. 在 `chrome://extensions/` 页面点击"打包扩展程序"
2. 选择 `extension` 目录
3. 生成 `.crx` 文件后，拖拽到浏览器安装

## 使用方法

### 1. 首次使用

1. 点击浏览器工具栏中的插件图标，打开弹出窗口
2. 点击"登录小红书"按钮，完成登录
3. 添加餐馆配置（手动添加或导入CSV/JSON文件）
4. 配置下载选项（图片数量、去水印等）
5. 点击"开始下载"按钮

### 2. 添加餐馆

**手动添加**：
- 点击"添加"按钮
- 输入餐馆名称和地点（可选）
- 点击"确定"

**批量导入**：
- 点击"导入"按钮
- 选择CSV或JSON文件
- CSV格式：`餐馆名称,地点(可选)`
- JSON格式：`[{"name": "餐馆名称", "location": "地点"}]`

### 3. 配置选项

在弹出窗口中可以配置：
- **每个餐馆下载的图片数**：默认6张
- **智能去除水印**：自动去除右下角水印
- **启用图片后处理**：图片优化和裁剪

### 4. 高级设置

点击"高级设置"按钮，可以配置：
- **AI服务配置**：API密钥、模型等
- **下载选项**：下载路径、延迟等
- **图片处理选项**：水印去除、图片处理等
- **数据管理**：导入导出、清除数据等

## 目录结构

```
extension/
├── manifest.json              # 插件配置文件
├── popup/                     # 弹出界面
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── content/                   # 内容脚本
│   ├── content.js
│   └── content.css
├── background/                # 后台脚本
│   └── background.js
├── options/                   # 选项页面
│   ├── options.html
│   ├── options.js
│   └── options.css
├── lib/                      # 共享库
│   ├── image-processor.js    # 图片处理
│   ├── download-manager.js   # 下载管理
│   └── storage-manager.js    # 存储管理
└── assets/                    # 静态资源
    └── icons/                 # 插件图标
```

## 技术实现

### 核心技术栈

- **Chrome Extension API**：使用Manifest V3
- **Content Script**：在小红书页面中运行，负责搜索和图片提取
- **Background Script**：Service Worker，处理下载管理和任务队列
- **Chrome Storage API**：数据持久化存储
- **Chrome Downloads API**：图片下载管理
- **Canvas API**：图片处理和水印去除

### 主要功能模块

1. **搜索功能** (`content/content.js`)
   - 在小红书页面中执行搜索
   - 使用DOM操作实现搜索框输入和页面导航

2. **图片提取** (`content/content.js`)
   - 提取搜索结果页面的图片URL
   - 处理懒加载图片
   - 移除水印相关URL参数

3. **下载管理** (`background/background.js`)
   - 使用Chrome Downloads API下载图片
   - 管理下载队列和进度
   - 处理下载错误和重试

4. **图片处理** (`lib/image-processor.js`)
   - 使用Canvas API处理图片
   - 智能裁剪去除水印区域
   - 图片格式转换和优化

5. **存储管理** (`lib/storage-manager.js`)
   - 使用Chrome Storage API存储配置和数据
   - 支持同步和本地存储
   - 数据导入导出功能

## 注意事项

1. **权限要求**：
   - `downloads`：下载图片
   - `storage`：保存配置和数据
   - `cookies`：管理登录状态
   - `tabs`：访问标签页
   - `activeTab`：访问当前活动标签页

2. **使用限制**：
   - 需要在小红书网站页面使用
   - 首次使用需要登录小红书账号
   - 下载的图片保存在Chrome默认下载目录

3. **兼容性**：
   - 支持Chrome 88+（Manifest V3）
   - 支持Edge 88+（基于Chromium）

## 开发说明

### 本地开发

1. 克隆项目到本地
2. 在Chrome中加载 `extension` 目录
3. 修改代码后，在 `chrome://extensions/` 页面点击"重新加载"按钮

### 调试

- **Popup调试**：右键点击插件图标 → "检查弹出内容"
- **Content Script调试**：在小红书页面按F12打开开发者工具
- **Background Script调试**：在 `chrome://extensions/` 页面点击"service worker"链接

### 构建

目前使用原生JavaScript，无需构建工具。如需打包：

```bash
# 使用Chrome的打包功能
# 在 chrome://extensions/ 页面点击"打包扩展程序"
```

## 更新日志

### v1.0.0 (2024-12-19)
- ✅ 初始版本发布
- ✅ 实现基础搜索和下载功能
- ✅ 实现批量处理功能
- ✅ 实现配置管理功能
- ✅ 实现图片水印去除功能
- ✅ 实现登录状态检测功能

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个工具。

---

**免责声明**：本工具仅供学习和研究使用，请遵守相关法律法规和网站服务条款。

