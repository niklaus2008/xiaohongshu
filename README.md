# 小红书餐馆图片下载工具

## 项目简介

这是一个基于Playwright的自动化工具，可以根据餐馆名称和地点信息，从小红书上搜索并下载对应餐馆的图片。

## 功能特点

- 🔍 根据餐馆名称和地点智能搜索
- 📸 自动下载餐馆相关图片
- 🎯 支持批量下载
- 📁 自动创建文件夹管理图片
- 🛡️ 内置反爬虫检测处理
- 📝 详细的日志记录
- 🔐 多种登录方式支持（手机号验证码、扫码登录、手动登录）
- 🍪 Cookie持久化，避免重复登录

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置登录信息

```bash
cp config.template.json config.json
```

编辑 `config.json`，推荐配置：
```json
{
  "login": {
    "method": "manual",        // 手动登录
    "autoLogin": true,         // 启用自动登录
    "saveCookies": true,       // 保存Cookie
    "cookieFile": "./cookies.json"
  }
}
```

### 3. 首次运行（需要登录一次）

```bash
npm run start:login
```

首次运行时会打开浏览器，请手动完成登录。登录成功后，Cookie会自动保存。

### 4. 后续使用（自动登录）

再次运行相同命令，程序会自动使用保存的Cookie登录，无需重复操作：

```bash
npm run start:login
```

## 使用方法

### 1. 配置登录信息

首先复制配置文件模板并填入您的信息：

```bash
cp config.template.json config.json
```

编辑 `config.json` 文件，配置登录方式：

```json
{
  "login": {
    "method": "phone",        // 登录方式: "phone"(手机号), "qr"(扫码), "manual"(手动)
    "phone": "13800138000",   // 手机号（手机号登录时使用）
    "autoLogin": true,        // 是否启用自动登录
    "saveCookies": true,      // 是否保存Cookie
    "cookieFile": "./cookies.json"  // Cookie保存文件
  },
  "scraper": {
    "downloadPath": "./downloads",
    "maxImages": 20,
    "headless": false,
    "delay": 2000,
    "timeout": 30000
  }
}
```

### 2. 基本用法

```javascript
const { XiaohongshuScraper } = require('./src/xiaohongshu-scraper');

const scraper = new XiaohongshuScraper({
  downloadPath: './downloads', // 下载路径
  maxImages: 20, // 最大下载图片数量
  headless: false, // 是否无头模式运行
  login: {
    method: 'phone', // 登录方式
    phone: '13800138000', // 手机号
    autoLogin: true, // 自动登录
    saveCookies: true // 保存Cookie
  }
});

// 搜索并下载餐馆图片
await scraper.searchAndDownload('海底捞', '北京朝阳区');
```

### 高级配置

```javascript
const scraper = new XiaohongshuScraper({
  downloadPath: './downloads',
  maxImages: 50,
  headless: true,
  delay: 2000, // 请求间隔（毫秒）
  timeout: 30000, // 页面加载超时时间
  userAgent: 'Mozilla/5.0...' // 自定义User-Agent
});
```

## API 文档

### XiaohongshuScraper 类

#### 构造函数参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| downloadPath | string | './downloads' | 图片下载保存路径 |
| maxImages | number | 20 | 最大下载图片数量 |
| headless | boolean | false | 是否无头模式运行 |
| delay | number | 1000 | 请求间隔时间（毫秒） |
| timeout | number | 30000 | 页面加载超时时间 |
| userAgent | string | 默认UA | 浏览器User-Agent |

#### 主要方法

##### searchAndDownload(restaurantName, location)

搜索并下载餐馆图片

**参数：**
- `restaurantName` (string): 餐馆名称
- `location` (string): 地点信息

**返回值：**
- `Promise<Object>`: 包含下载结果的对象

**示例：**
```javascript
const result = await scraper.searchAndDownload('星巴克', '上海徐汇区');
console.log(`成功下载 ${result.downloadedCount} 张图片`);
```

##### close()

关闭浏览器实例

**示例：**
```javascript
await scraper.close();
```

## 登录方式说明

### 🍪 Cookie持久化方案（强烈推荐）

**一次登录，长期使用！**

- 配置 `"method": "manual"` 和 `"saveCookies": true`
- 首次运行时手动登录一次
- 登录状态自动保存到本地Cookie文件
- 后续运行自动使用Cookie，无需重复登录
- 只有在Cookie失效时才需要重新登录

**优势：**
- ✅ 无需每次输入验证码
- ✅ 无需每次扫码
- ✅ 自动化程度高
- ✅ 用户体验最佳

### 其他登录方式（备选）

### 1. 手机号验证码登录
- 配置 `"method": "phone"` 和您的手机号
- 程序会自动输入手机号并获取验证码
- 您需要在浏览器中输入收到的验证码
- **注意：每次运行都需要获取验证码，不够便捷**

### 2. 扫码登录
- 配置 `"method": "qr"`
- 程序会显示二维码，使用小红书APP扫描即可登录
- **注意：每次运行都需要扫码，不够便捷**

### 3. 手动登录
- 配置 `"method": "manual"`
- 程序会打开浏览器，您手动完成登录流程
- 推荐与Cookie持久化配合使用

## 注意事项

1. **合规使用**：请遵守小红书的服务条款，仅用于个人学习和研究目的
2. **频率控制**：建议设置适当的请求间隔，避免对服务器造成过大压力
3. **网络环境**：确保网络连接稳定，建议使用代理服务器
4. **存储空间**：确保有足够的磁盘空间存储下载的图片
5. **登录安全**：配置文件包含敏感信息，请妥善保管，不要提交到版本控制系统

## 错误处理

工具内置了完善的错误处理机制：

- 网络连接错误自动重试
- 页面加载超时处理
- 图片下载失败处理
- 详细的错误日志记录

## 更新日志

### v1.0.0
- 初始版本发布
- 实现基本的搜索和下载功能
- 添加错误处理和日志记录

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个工具。

---

**免责声明**：本工具仅供学习和研究使用，请遵守相关法律法规和网站服务条款。
