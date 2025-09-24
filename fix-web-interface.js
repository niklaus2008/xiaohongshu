/**
 * 修复web-interface.js文件中的重复代码和语法错误
 */

const fs = require('fs');
const path = require('path');

async function fixWebInterface() {
    try {
        console.log('🔧 开始修复web-interface.js文件...');
        
        const filePath = path.join(__dirname, 'src/web-interface.js');
        let content = await fs.readFile(filePath, 'utf8');
        
        // 移除重复的代码块
        const lines = content.split('\n');
        const cleanedLines = [];
        let inMethod = false;
        let braceCount = 0;
        let methodStart = -1;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 检测方法开始
            if (line.includes('async handleLoginStatus(req, res)') && !inMethod) {
                inMethod = true;
                methodStart = i;
                braceCount = 0;
            }
            
            if (inMethod) {
                // 计算大括号
                for (const char of line) {
                    if (char === '{') braceCount++;
                    if (char === '}') braceCount--;
                }
                
                // 如果大括号平衡，方法结束
                if (braceCount === 0 && line.includes('}')) {
                    inMethod = false;
                    cleanedLines.push(line);
                    break;
                }
                
                // 跳过重复的代码
                if (line.includes('return true;') && i > methodStart + 20) {
                    continue;
                }
                
                cleanedLines.push(line);
            } else {
                cleanedLines.push(line);
            }
        }
        
        // 重新构建文件内容
        const cleanedContent = cleanedLines.join('\n');
        
        // 写入修复后的文件
        await fs.writeFile(filePath, cleanedContent, 'utf8');
        
        console.log('✅ web-interface.js文件修复完成');
        
    } catch (error) {
        console.error('❌ 修复失败:', error);
    }
}

// 运行修复
fixWebInterface();
