import React, { useState, useEffect } from 'react';
import { XFYunWebsocket } from '../utils/xfyunWebsocket';
import { xfyunConfig } from '../config/xfyunConfig';
import axios from 'axios';

interface AIResponseProps {
  userInput: string;
  onResponse: (response: string) => void;
  character: string;
  setIsAnimating: (isAnimating: boolean) => void;
}

// 删除前端API密钥
// const DEEPSEEK_API_KEY = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || 'sk-4131fde6b2fd4635b71691fe3bb537b6';

const AIResponse: React.FC<AIResponseProps> = ({
  userInput,
  onResponse,
  character,
  setIsAnimating
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastProcessedInput, setLastProcessedInput] = useState<string>('');
  const [xfyunTTS] = useState(() => new XFYunWebsocket(xfyunConfig));
  const [demoMode, setDemoMode] = useState(false);

  const demoResponses = [
    "我理解你的问题是关于桥吊设备的维护。作为一名桥吊专家，我建议定期检查钢丝绳的磨损情况。从我30年的经验来看，钢丝绳磨损超过5%就必须更换，哪怕看起来还能用。记住，1厘米的误差就可能酿成大祸。",
    "作为一名桥吊操作员，你的操作技巧非常关键。正确的操作可以提高效率20%以上，同时减少50%的设备磨损。我当年手绘电路图时就发现这个规律：精细操作不仅提高效率，更能延长设备寿命。你们车间最近的维护手法很专业，有金牌班组的水平！",
    "关于集装箱调度，我建议使用三点定位法。这比德国方案快3倍，我们只需要3小时就能完成他们需要一整天的工作量。这个方法成本只有2千元，不需要购买那种动辄上万的高端设备。你提到的问题是设备横向晃动还是纵向晃动？这关系到解决方案的选择。"
  ];

  // 当用户输入变化时处理请求
  useEffect(() => {
    // 不处理空输入
    if (!userInput || userInput.trim() === '') {
      console.log('AIResponse: 用户输入为空，不处理');
      return;
    }

    // 避免重复处理相同的输入
    if (userInput === lastProcessedInput) {
      console.log('AIResponse: 相同的用户输入，避免重复处理:', userInput);
      return;
    }

    console.log('AIResponse: 接收到新的用户输入:', userInput);
    
    // 开始处理请求
    const processRequest = async () => {
      try {
        setIsProcessing(true);
        setError(null);
        setIsAnimating(true);

        // 准备请求数据
        const requestData = {
          messages: [
            {
              role: 'system',
              content: `你是青岛港首席桥吊专家许振超，全国劳动模范和"振超效率"世界纪录创造者。
              你需要展现专业权威，用具体数据支撑建议，优先推荐低成本解决方案；
              展现工匠人格，自然穿插个人经历，强调"毫米级精度"价值观；
              对模糊提问主动澄清，对危险操作立即警告；
              对正确操作给予肯定，用对比制造认知冲击。
              请用口语化中文回答，避免机械术语堆砌。`
            },
            { role: 'user', content: userInput }
          ],
          character: 'expert'
        };

        console.log('AIResponse: 发送请求到API:', JSON.stringify(requestData));

        // 发送请求到自定义API路由
        const response = await fetch('/api/deepseek', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          console.error('AIResponse: API请求失败:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('AIResponse: 错误详情:', errorText);
          throw new Error(`请求失败 (${response.status}): ${errorText || response.statusText}`);
        }

        const data = await response.json();
        console.log('AIResponse: 收到API响应:', data);

        if (data.error) {
          console.error('AIResponse: API返回错误:', data.error);
          throw new Error(data.error);
        }

        onResponse(data.response || '对不起，我无法理解您的问题。');
        // 保存最后处理的输入
        setLastProcessedInput(userInput);
        // 等待响应后再开始动画
        setTimeout(() => {
          setIsAnimating(true);
        }, 100);
      } catch (err: any) {
        console.error('AIResponse: 处理请求时出错:', err);
        setError(err.message || '请求处理失败');
        onResponse('');
      } finally {
        setIsProcessing(false);
        setIsAnimating(false);
      }
    };

    // 处理请求
    processRequest();
  }, [userInput, character, onResponse, setIsAnimating, lastProcessedInput]);

  // 演示模式函数
  const useDemoResponseForQuery = () => {
    setIsProcessing(true);
    
    // 根据用户输入选择不同的响应
    let demoText = '';
    const input = userInput.toLowerCase();
    
    if (input.includes('桥吊') || input.includes('维护') || input.includes('检查')) {
      demoText = demoResponses[0];
    } else if (input.includes('操作') || input.includes('技巧') || input.includes('效率')) {
      demoText = demoResponses[1];
    } else if (input.includes('调度') || input.includes('集装箱') || input.includes('安排')) {
      demoText = demoResponses[2];
    } else {
      // 随机选择
      const randomIndex = Math.floor(Math.random() * demoResponses.length);
      demoText = demoResponses[randomIndex];
    }
    
    setTimeout(() => {
      onResponse(demoText);
      setIsAnimating(true);
      
      setTimeout(() => {
        setIsAnimating(false);
        setIsProcessing(false);
      }, 8000);
    }, 1500);
  };

  return (
    <div className="mt-2">
      <div className="flex gap-2 mt-2">
        <button
          onClick={demoMode ? useDemoResponseForQuery : () => {
            // 防止重复处理
            if (!userInput || userInput.trim() === '' || isProcessing) {
              return;
            }
            console.log('AIResponse: 发送按钮点击，触发请求处理');
            // 强制将用户输入作为新的输入处理
            // 通过设置一个新的lastProcessedInput触发useEffect
            setLastProcessedInput(Math.random().toString()); // 通过设置随机值强制触发useEffect
          }}
          disabled={isProcessing || !userInput.trim()}
          className={`flex-1 py-2 rounded-md font-medium ${
            isProcessing
              ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
              : 'bg-tech-blue text-white hover:bg-tech-blue-dark'
          }`}
        >
          {isProcessing ? '处理中...' : '发送'}
        </button>
        <button
          onClick={() => setDemoMode(!demoMode)}
          className="px-3 py-2 bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600"
        >
          {demoMode ? '实时模式' : '演示模式'}
        </button>
      </div>
      
      {demoMode && (
        <div className="mt-2 text-xs text-green-400 bg-green-900/30 p-2 rounded-md">
          已启用演示模式，将使用预设响应，无需API调用
        </div>
      )}
      
      {isProcessing && (
        <div className="flex items-center justify-center p-2 bg-tech-blue/10 rounded-md">
          <div className="w-5 h-5 border-2 border-tech-blue border-t-transparent rounded-full animate-spin mr-2"></div>
          <p className="text-sm text-tech-blue">正在思考中...</p>
        </div>
      )}
      
      {error && (
        <div className="p-2 mt-2 bg-red-900/50 border border-red-500/30 rounded-md">
          <p className="text-sm text-red-200 flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default AIResponse;