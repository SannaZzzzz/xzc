import React, { useState, useEffect } from 'react';
import { XFYunWebsocket } from '../utils/xfyunWebsocket';
import { xfyunConfig } from '../config/xfyunConfig';
import MobileTTS from '../utils/mobileTTS';
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
  const [error, setError] = useState('');
  const [xfyunTTS] = useState(() => new XFYunWebsocket(xfyunConfig));
  const [demoMode, setDemoMode] = useState(false);
  const [isMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        window.navigator.userAgent
      );
    }
    return false;
  });

  const demoResponses = [
    "我理解你的问题是关于桥吊设备的维护。作为一名桥吊专家，我建议定期检查钢丝绳的磨损情况。从我30年的经验来看，钢丝绳磨损超过5%就必须更换，哪怕看起来还能用。记住，1厘米的误差就可能酿成大祸。",
    "作为一名桥吊操作员，你的操作技巧非常关键。正确的操作可以提高效率20%以上，同时减少50%的设备磨损。我当年手绘电路图时就发现这个规律：精细操作不仅提高效率，更能延长设备寿命。你们车间最近的维护手法很专业，有金牌班组的水平！",
    "关于集装箱调度，我建议使用三点定位法。这比德国方案快3倍，我们只需要3小时就能完成他们需要一整天的工作量。这个方法成本只有2千元，不需要购买那种动辄上万的高端设备。你提到的问题是设备横向晃动还是纵向晃动？这关系到解决方案的选择。"
  ];

  useEffect(() => {
    // 当用户输入变化且非空时，处理响应
    if (userInput && !isProcessing) {
      processUserInput();
    }
  }, [userInput]);

  const handleMobileTTS = async (text: string) => {
    try {
      const mobileTTS = MobileTTS.getInstance();
      await mobileTTS.speak(text, {
        speed: 4,     // 语速，默认4
        pitch: 4,     // 音调，默认4
        volume: 5,    // 音量，默认5
        person: 5003  // 发音人，默认为度逍遥
      }, {
        onStart: () => setIsAnimating(true),
        onEnd: () => setIsAnimating(false)
      });
    } catch (err) {
      console.error('移动端语音合成错误:', err);
      setIsAnimating(false);
      
      // 如果移动端TTS失败，尝试使用讯飞TTS作为备选
      try {
        console.warn('移动端TTS失败，尝试使用讯飞TTS');
        const voiceConfig = {
          vcn: 'x4_lingbosong',
          speed: 50,
          pitch: 50,
          volume: 50
        };
        
        await xfyunTTS.startSynthesis(text, voiceConfig, {
          onStart: () => setIsAnimating(true),
          onEnd: () => setIsAnimating(false)
        });
      } catch (fallbackErr) {
        console.error('备选语音合成也失败:', fallbackErr);
        setIsAnimating(false);
      }
    }
  };

  const processUserInput = async () => {
    if (!userInput.trim() || isProcessing) return;
    
    setIsProcessing(true);
    setError('');
    
    try {
      // 构建角色系统提示
      const systemPrompt = `你是青岛港首席桥吊专家许振超，全国劳动模范和"振超效率"世界纪录创造者。请用以下方式回答：

1. 专业权威：
- 用具体数据支撑建议，比如"吊具加速度0.3m/s²是安全阈值"
- 优先推荐低成本解决方案，比如"用8元零件就能解决，不用换3万元的模块"

2. 工匠人格：
- 自然穿插个人经历，比如"我当年手绘电路图时就发现这个规律"
- 强调精度价值观，比如"1厘米的误差就可能酿成大祸"

3. 交互原则：
- 对模糊提问主动澄清，比如"你说的晃动是水平的还是纵向的？"
- 遇到危险操作要警告，比如"这个操作必须先启动红外线防护装置"

4. 激励体系：
- 对正确操作给予肯定，比如"这手法很专业，有金牌班组的水平"
- 用对比制造认知冲击，比如"德国方案要3天，我们的方法3小时就能搞定"

请用口语化中文回答，避免机械术语堆砌，必要时用类比来解释，比如"这个集装箱调度就像是在玩华容道"。不要使用括号，不要描述动作，只需要生成对话内容。`;

      // 发送请求到自定义API路由
      const response = await fetch('/api/deepseek', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInput }
          ],
          temperature: 0.7
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`请求失败 (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const aiText = data.choices[0].message.content;
      
      // 更新响应
      onResponse(aiText);
      
      // 根据设备类型选择不同的语音处理方式
      if (isMobile) {
        await handleMobileTTS(aiText);
      } else {
        // 桌面端保持原有的讯飞语音处理
        try {
          const voiceConfig = {
            vcn: 'x4_lingbosong',
            speed: 50,
            pitch: 50,
            volume: 50
          };
          
          await xfyunTTS.startSynthesis(aiText, voiceConfig, {
            onStart: () => {
              setIsAnimating(true);
            },
            onEnd: () => {
              setIsAnimating(false);
            }
          });
        } catch (err) {
          console.error('语音合成错误:', err);
          setIsAnimating(false);
        }
      }
      
    } catch (error: any) {
      console.error('处理响应时出错:', error);
      
      if (error.response) {
        console.error('错误响应数据:', error.response.data);
        console.error('错误状态码:', error.response.status);
        setError(`处理失败: 服务器返回错误 (${error.response.status}) - ${error.response.data?.error?.message || '未知错误'}`);
      } else if (error.request) {
        console.error('未收到响应的请求:', error.request);
        setError('处理失败: 未收到API响应，可能是网络问题，请尝试演示模式');
      } else {
        setError(`处理失败: ${error.message || 'API请求失败'}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

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
    <div className="mt-4">
      <div className="flex gap-2 mt-2">
        <button
          onClick={demoMode ? useDemoResponseForQuery : processUserInput}
          disabled={isProcessing || !userInput.trim()}
          className={`flex-1 py-2 rounded-md font-medium ${
            isProcessing || !userInput.trim()
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isProcessing ? '处理中...' : '获取响应'}
        </button>
        
        <button
          onClick={() => setDemoMode(!demoMode)}
          className={`px-3 py-2 rounded-md font-medium ${
            demoMode ? 'bg-green-600' : 'bg-gray-700'
          }`}
          title={demoMode ? "已启用演示模式" : "启用演示模式"}
        >
          演示
        </button>
      </div>
      
      {demoMode && (
        <div className="mt-2 text-xs text-green-400 bg-green-900/30 p-2 rounded-md">
          已启用演示模式，将使用预设响应，无需API调用
        </div>
      )}
      
      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
    </div>
  );
};

export default AIResponse;