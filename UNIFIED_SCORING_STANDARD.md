# 统一登录评分标准

## 评分计算规则

### 基础评分
- Cookie数量：每个有效Cookie = 1分
- 重要Cookie类型：每个 = 2分（session, token, user, auth）
- 小红书特有Cookie：每个 = 3分（xiaohongshu, xhs, web_session, web_sessionid）

### 登录判断标准
- 评分 >= 3：认为已登录
- 评分 < 3：认为未登录
- 最高评分限制：10分

### 统一检测流程
1. 检查Cookie文件是否存在
2. 验证Cookie是否过期
3. 计算Cookie评分
4. 检查页面元素状态
5. 综合判断登录状态

## 修复内容
- Web界面和爬虫使用相同的评分标准
- 提高登录判断阈值到3分
- 统一检测流程和错误处理
- 确保检测结果一致