# 虚拟许振超互动项目

这是一个基于Next.js的AI交互应用，集成了语音识别、AI响应生成和语音合成功能。

## 环境变量设置

本项目使用环境变量来存储API密钥，提高安全性。请按照以下步骤设置：

1. 在项目根目录创建 `.env.local` 文件
2. 添加以下环境变量：

```
NEXT_PUBLIC_DEEPSEEK_API_KEY=your_deepseek_api_key_here
NEXT_PUBLIC_XFYUN_APPID=your_xfyun_appid_here
NEXT_PUBLIC_XFYUN_API_SECRET=your_xfyun_api_secret_here
NEXT_PUBLIC_XFYUN_API_KEY=your_xfyun_api_key_here
```

3. 将您的实际API密钥替换上述占位符

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## Vercel部署

1. 在Vercel平台创建新项目并导入此代码库
2. 在Vercel项目设置中添加环境变量：
   - `NEXT_PUBLIC_DEEPSEEK_API_KEY`
   - `NEXT_PUBLIC_XFYUN_APPID`
   - `NEXT_PUBLIC_XFYUN_API_SECRET`
   - `NEXT_PUBLIC_XFYUN_API_KEY`
3. 确保填入与本地开发相同的API密钥值
4. 部署项目

注意：环境变量以`NEXT_PUBLIC_`开头，这意味着它们会在构建时注入到客户端代码中。虽然这不是最安全的方法，但对于静态部署来说是一种实用的解决方案。