import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import SpeechRecognition from '../components/SpeechRecognition';
import CharacterAnimation from '../components/CharacterAnimation';
import AIResponse from '../components/AIResponse';

export default function Home() {
  const [userInput, setUserInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const character = 'default'; // 默认使用默认角色
  const [isMobile, setIsMobile] = useState(false);

  // 检测移动设备
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // 初始检测
    handleResize();
    
    // 监听窗口大小变化
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="min-h-screen bg-tech-dark text-white relative overflow-hidden">
      {/* 背景网格 */}
      <div className="absolute inset-0 bg-tech-grid opacity-20 pointer-events-none"></div>
      
      {/* 背景光效 */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-tech-blue opacity-10 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-tech-blue opacity-10 rounded-full filter blur-3xl"></div>
      
      <Head>
        <title>虚拟许振超 | AI交互</title>
        <meta name="description" content="青岛港首席桥吊专家许振超的智能助手" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-4 md:py-6 relative z-10">
        {/* Logo和标题区域 */}
        <div className="flex flex-col md:flex-row items-center justify-center mb-4 md:mb-6">
          <div className="w-20 h-auto md:w-22 md:h-auto relative mb-2 md:mb-0 md:mr-4 scale-80 transform">
            <Image 
              src="/logo.png" 
              alt="虚拟许振超Logo" 
              width={90} 
              height={90} 
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-center tech-title">
            <span className="text-tech-blue block">千万职工共读经典主题活动之AI共读</span>
          </h1>
        </div>

        {isMobile ? (
          // 移动端布局 - 使用栈式布局并调整组件大小与对齐
          <div className="flex flex-col items-center">
            {/* 动画容器 - 宽度为屏幕80%，高度自适应 */}
            <div className="tech-card rounded-xl bg-gray-800 p-3 w-[80%] mb-4">
              <h2 className="text-xl font-semibold mb-3 flex items-center">
                <span className="inline-block w-2 h-2 bg-tech-blue rounded-full mr-2 animate-pulse"></span>
                专家形象：虚拟许振超
              </h2>
              <div className="border-2 border-opacity-40 border-tech-blue rounded-lg flex items-center justify-center glowing-border overflow-hidden">
                <div className="w-full">
                  <CharacterAnimation
                    character={character}
                    isAnimating={isAnimating}
                    response={aiResponse}
                  />
                </div>
              </div>
            </div>

            {/* 对话框 - 与动画容器相同宽度 */}
            <div className="tech-card rounded-xl bg-gray-800 p-3 w-[80%]">
              <h2 className="text-xl font-semibold mb-3 flex items-center">
                <span className="inline-block w-2 h-2 bg-tech-blue rounded-full mr-2 animate-pulse"></span>
                专家对话
              </h2>

              <div className="mb-4 h-48 overflow-y-auto bg-gray-900 rounded-lg p-3 glowing-border border border-tech-blue border-opacity-30">
                {userInput && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-400">你：</p>
                    <p className="bg-gray-800 bg-opacity-70 rounded-lg p-2 backdrop-filter backdrop-blur-sm text-sm">{userInput}</p>
                  </div>
                )}

                {aiResponse && (
                  <div className="mb-2">
                    <p className="text-xs text-tech-blue">虚拟许振超：</p>
                    <p className="bg-tech-dark bg-opacity-70 rounded-lg p-2 border border-tech-blue border-opacity-20 shadow-neon text-sm">{aiResponse}</p>
                  </div>
                )}
              </div>

              <SpeechRecognition
                onResult={setUserInput}
                isListening={isListening}
                setIsListening={setIsListening}
              />

              <AIResponse
                userInput={userInput}
                onResponse={setAiResponse}
                character={character}
                setIsAnimating={setIsAnimating}
              />
            </div>
          </div>
        ) : (
          // 桌面端布局 - 使用相对定位并居中整体，减小高度以避免滚动条
          <div className="relative w-full h-[80vh] max-w-[90%] mx-auto flex justify-center">
            {/* 整体容器 - 固定宽度并居中 */}
            <div className="relative w-[95%] h-full">
              {/* 动画区域 - 修改：调整样式以配合新的动画缩放逻辑 */}
              <div className="absolute top-[2%] left-[30%] transform -translate-x-1/2 w-auto h-[88%] flex flex-col items-center origin-top">
                {/* 将标题放在动画框上方中央 */}
                <h2 className="text-2xl font-semibold mb-2 text-center flex items-center">
                  <span className="inline-block w-2 h-2 bg-tech-blue rounded-full mr-2 animate-pulse"></span>
                  专家形象：虚拟许振超
                </h2>
                
                <div className="tech-card rounded-xl bg-gray-800 p-3 h-full w-full">
                  <div className="border-2 border-opacity-40 border-tech-blue rounded-lg flex items-center justify-center h-full w-full overflow-hidden glowing-border">
                    <CharacterAnimation
                      character={character}
                      isAnimating={isAnimating}
                      response={aiResponse}
                    />
                  </div>
                </div>
              </div>

              {/* 对话区域 - 右侧，底部对齐，距离减小 */}
              <div className="absolute bottom-[7%] right-[12%] w-[32%] tech-card rounded-xl bg-gray-800 p-3">
                <h2 className="text-xl font-semibold mb-2 flex items-center">
                  <span className="inline-block w-2 h-2 bg-tech-blue rounded-full mr-2 animate-pulse"></span>
                  专家对话
                </h2>

                <div className="h-32 overflow-y-auto bg-gray-900 rounded-lg p-3 mb-2 glowing-border border border-tech-blue border-opacity-30">
                  {userInput && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-400">你：</p>
                      <p className="bg-gray-800 bg-opacity-70 rounded-lg p-1 text-sm backdrop-filter backdrop-blur-sm">{userInput}</p>
                    </div>
                  )}

                  {aiResponse && (
                    <div className="mb-2">
                      <p className="text-xs text-tech-blue">虚拟许振超：</p>
                      <p className="bg-tech-dark bg-opacity-70 rounded-lg p-1 text-sm border border-tech-blue border-opacity-20 shadow-neon">{aiResponse}</p>
                    </div>
                  )}
                </div>

                <div className="mt-auto">
                  <SpeechRecognition
                    onResult={setUserInput}
                    isListening={isListening}
                    setIsListening={setIsListening}
                  />

                  <AIResponse
                    userInput={userInput}
                    onResponse={setAiResponse}
                    character={character}
                    setIsAnimating={setIsAnimating}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        <footer className="mt-6 text-center text-sm text-gray-400">
          <p>© {new Date().getFullYear()} 虚拟许振超 | 粤水电AI交互平台</p>
          <p className="mt-1">支持桌面端和移动端访问，推荐使用Edge浏览器访问</p>
        </footer>
      </main>
    </div>
  );
}
