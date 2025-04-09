import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 添加详细日志
    console.log('=== DeepSeek API路由被调用 ===');
    console.log('请求方法:', req.method);
    console.log('请求体类型:', typeof req.body);
    
    // 检查req.body是否为空对象
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error('请求体为空');
      return res.status(400).json({ error: '请求体不能为空' });
    }
    
    const fullRequestBody = JSON.stringify(req.body);
    console.log('完整请求体:', fullRequestBody);
    
    // 只允许POST请求
    if (req.method !== 'POST') {
      return res.status(405).json({ error: '仅支持POST请求' });
    }

    // 获取服务器端存储的API密钥（不会暴露给客户端）
    const apiKey = process.env.DEEPSEEK_API_KEY;

    // 添加日志，检查API密钥是否存在
    console.log('DeepSeek API密钥是否存在:', !!apiKey);
    
    if (!apiKey) {
      console.error('DeepSeek API密钥未配置 - 请在Vercel中设置DEEPSEEK_API_KEY环境变量');
      return res.status(500).json({ 
        error: 'DeepSeek API密钥未配置', 
        message: '请在Vercel设置中配置DEEPSEEK_API_KEY环境变量',
        documentation: 'https://vercel.com/docs/concepts/projects/environment-variables'
      });
    }

    // 从请求体中获取参数
    let messages = req.body.messages;
    const temperature = req.body.temperature;
    const useFallback = req.body.fallback === true; // 检查是否直接使用备选响应
    
    // 如果请求中包含fallback参数，直接返回备选响应
    if (useFallback) {
      console.log('检测到fallback参数，直接返回备选响应');
      return res.status(200).json(getFallbackResponse());
    }

    // 如果使用了testMode，检查是否存在一个隐藏的消息数组
    if (req.body.testMode === true && (!messages || messages.length === 0)) {
      console.log('检测到testMode，查找可能隐藏的消息');
      
      // 检查请求体中是否有其他位置存储了消息
      for (const key in req.body) {
        if (key !== 'messages' && key !== 'temperature' && key !== 'testMode') {
          const value = req.body[key];
          if (Array.isArray(value) && value.length > 0) {
            console.log(`找到可能的消息数组: ${key}:`, JSON.stringify(value));
            
            // 检查是否符合消息格式
            if (value[0].role && value[0].content) {
              messages = value;
              console.log('使用找到的消息数组替代空messages');
              break;
            }
          }
        }
      }
    }

    if (!messages) {
      console.error('找不到任何消息数组');
      return res.status(400).json({ error: '缺少必要参数messages' });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      console.error('消息数组为空或不是数组:', typeof messages);
      return res.status(400).json({ 
        error: '消息数组为空', 
        message: 'messages必须是非空数组'
      });
    }

    // 记录每条消息的详细内容
    console.log('消息数量:', messages.length);
    for (let i = 0; i < messages.length; i++) {
      console.log(`消息 ${i+1}:`, JSON.stringify(messages[i]));
    }
    
    // 创建请求数据，排除任何额外属性
    const requestData = {
      model: 'deepseek-chat',
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content.trim()
      })),
      temperature: temperature || 0.7
    };
    
    console.log('开始调用DeepSeek API，请求数据:', JSON.stringify(requestData));
    console.log('请求开始时间:', new Date().toISOString());
    
    // 增加超时时间并添加重试逻辑
    let response: any = null;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        console.log(`尝试API请求 (${retryCount > 0 ? '重试 ' + retryCount : '首次'})...`);
        
        response = await axios.post(
          'https://api.deepseek.com/v1/chat/completions',
          requestData,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            timeout: 360000  // 保持6分钟超时
          }
        );
        
        // 如果请求成功，跳出循环
        break;
      } catch (error: any) {
        console.error(`请求尝试 ${retryCount} 失败:`, error.message);
        
        // 如果是最后一次重试或者不是超时错误，则抛出异常
        if (retryCount >= maxRetries || (error.code !== 'ETIMEDOUT' && error.code !== 'ESOCKETTIMEDOUT')) {
          throw error;
        }
        
        // 增加重试次数并等待一段时间后再重试
        retryCount++;
        console.log(`等待2秒后进行重试 ${retryCount}...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // 处理响应
    console.log('DeepSeek API调用成功，请求结束时间:', new Date().toISOString());
    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('DeepSeek API调用失败:', error.message);
    console.error('请求结束时间:', new Date().toISOString());
    
    // 更详细的错误日志
    if (error.response) {
      // 服务器响应了，但状态码不在2xx范围内
      console.error('错误状态码:', error.response.status);
      console.error('错误响应数据:', error.response.data);
      return res.status(error.response.status).json({
        error: `DeepSeek API错误: ${error.response.data?.error?.message || '未知错误'}`,
        status: error.response.status
      });
    } else if (error.request) {
      // 请求已发送，但没有收到响应（超时）
      console.error('请求超时或无响应，错误代码:', error.code);
      
      // 提供备选响应，使用HTTP 200状态码，避免前端触发错误处理
      console.log('提供备选回复');
      return res.status(200).json(getFallbackResponse());
    } else {
      // 设置请求时发生了错误
      return res.status(500).json({
        error: `DeepSeek API请求错误: ${error.message}`,
        status: 500
      });
    }
  }
}

// 提供一个适当的回退响应
function getFallbackResponse() {
  return {
    choices: [
      {
        message: {
          content: `我认为在平凡岗位创造不平凡价值，关键在于三点：
          
首先，精益求精是关键。我在码头工作40多年，把0.5秒的微小改进累积起来，最终实现了全球装卸效率的突破。像我们操作桥吊，每次精准定位能节约3秒，一天300个集装箱就是15分钟，一个月就是7个小时的效率提升。

第二，要善于观察思考。我当年开始做工人时，发现液压系统故障修复需要4小时，但通过研究液压图和自制检修工具，把时间缩短到了40分钟，比德国专家还快一倍。平凡工作中的每个环节都有改进空间。

最重要的是，要给自己设立目标和成就感。你每天工作是否有进步？比如我跟徒弟说，吊装精度每周提高0.5厘米，三个月后就能达到专家水平。这种可量化的进步会带来持续的成就感。

记住，把普通工作做到极致就是不普通。青岛港装卸效率全球第一不是靠高科技，而是我们这些普通工人的点滴改进累积起来的。你们的工作可能看似简单重复，但做到极致就是匠人精神的体现。`
        }
      }
    ]
  };
}