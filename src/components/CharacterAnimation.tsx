import React, { useEffect, useRef, useState } from "react";

interface CharacterAnimationProps {
  character: string;
  isAnimating: boolean;
  response: string;
}

const CharacterAnimation: React.FC<CharacterAnimationProps> = ({
  character,
  isAnimating,
  response
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number>();
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState(16/9); // 默认视频比例

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

  useEffect(() => {
    const video = document.createElement("video");
    videoRef.current = video;
    video.muted = true;
    video.playsInline = true;
    video.loop = true;

    const basePath = process.env.NODE_ENV === "production" && 
                    typeof window !== "undefined" && 
                    window.location.hostname.includes("github.io") 
                    ? "/interaction" : "";

    let videoSrc = "";
    switch (character) {
      case "anime":
        videoSrc = `${basePath}/animations/anime-character.mp4`;
        break;
      case "custom":
        videoSrc = `${basePath}/animations/custom-character.mp4`;
        break;
      default:
        videoSrc = `${basePath}/animations/default-character.mp4`;
        break;
    }

    console.log("Video source path:", videoSrc);

    // 模拟加载进度
    const loadingInterval = setInterval(() => {
      setLoadingProgress(prev => {
        const newProgress = prev + Math.random() * 10;
        return newProgress >= 100 ? 100 : newProgress;
      });
    }, 200);

    video.onloadeddata = () => {
      clearInterval(loadingInterval);
      setLoadingProgress(100);
      setVideoLoaded(true);
      console.log("Video loaded successfully");
      // 保存视频的原始宽高比
      if (video.videoWidth && video.videoHeight) {
        setVideoAspectRatio(video.videoWidth / video.videoHeight);
      }
    };

    video.onerror = (e) => {
      clearInterval(loadingInterval);
      console.error("Video load error:", e);
      if (!basePath && typeof window !== "undefined" && window.location.hostname.includes("github.io")) {
        const fallbackPath = "/interaction/animations/default-character.mp4";
        console.log("Trying fallback path:", fallbackPath);
        video.src = fallbackPath;
      }
    };

    video.src = videoSrc;
    video.load();

    return () => {
      clearInterval(loadingInterval);
      if (video) {
        video.pause();
        video.src = "";
        video.load();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [character]);

  useEffect(() => {
    if (!videoLoaded || !videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const video = videoRef.current;

    // 设置Canvas初始尺寸
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;

    // 如果是移动设备，则调整Canvas大小以适应容器宽度
    if (isMobile && containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      // 保持视频的原始宽高比
      const aspectRatio = canvas.width / canvas.height;
      
      // 设置宽度为容器宽度，高度根据宽高比计算
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
    } else if (!isMobile && containerRef.current) {
      // 桌面端处理 - 修改：先等比例缩小至动画框的高度，然后把动画框等比例缩小至动画宽度
      const containerHeight = containerRef.current.clientHeight;
      const containerWidth = containerRef.current.clientWidth;
      
      // 1. 首先将动画等比例缩小至动画框的高度
      canvas.style.height = '100%';
      canvas.style.width = 'auto';
      
      // 2. 计算根据高度缩放后的实际宽度
      // 由于canvas.style.width已设为'auto'，这里计算缩放后的宽度
      const scaledWidth = (containerHeight * videoAspectRatio);
      
      // 3. 如果缩放后的宽度超出容器宽度，则需要进一步等比例缩小至宽度
      if (scaledWidth > containerWidth) {
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
      }
    }

    if (isAnimating) {
      video.currentTime = 0;

      const playVideo = async () => {
        try {
          await video.play();
          console.log("Video playing");
        } catch (err) {
          console.error("Video play failed:", err);
        }
      };

      playVideo();

      const renderFrame = () => {
        if (!isAnimating) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 设置科技感效果
        ctx.save();
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // 为视频添加科技感特效 - 淡蓝色边缘光晕
        ctx.globalCompositeOperation = 'screen';
        ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        animationFrameRef.current = requestAnimationFrame(renderFrame);
      };

      renderFrame();
    } else {
      video.pause();
      if (video.readyState >= 2) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // 静态下也添加科技感边框
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.shadowColor = 'rgba(56, 189, 248, 0.3)';
        ctx.shadowBlur = 5;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isAnimating, videoLoaded, isMobile, videoAspectRatio]);

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {!videoLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-tech-dark bg-opacity-50 backdrop-filter backdrop-blur-sm z-10">
          <div className="w-16 h-16 relative mb-3">
            <div className="absolute inset-0 rounded-full border-2 border-tech-blue opacity-20"></div>
            <div 
              className="absolute inset-0 rounded-full border-2 border-transparent border-t-tech-blue animate-spin"
              style={{ animationDuration: '1s' }}
            ></div>
          </div>
          <div className="text-lg text-tech-blue font-medium">加载角色动画中...</div>
          <div className="w-48 h-2 bg-gray-800 rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full bg-tech-blue transition-all duration-200 rounded-full"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-400 mt-1">{Math.floor(loadingProgress)}%</div>
        </div>
      )}
      
      {/* 装饰性科技边角 */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-tech-blue opacity-70"></div>
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-tech-blue opacity-70"></div>
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-tech-blue opacity-70"></div>
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-tech-blue opacity-70"></div>
      
      <canvas
        ref={canvasRef}
        className={`object-contain rounded-sm ${isMobile ? 'w-full h-auto' : ''}`}
      />
      
      {isAnimating && (
        <div className="absolute bottom-4 left-4 right-4 bg-tech-dark bg-opacity-80 backdrop-filter backdrop-blur-sm p-2 rounded-md border border-tech-blue border-opacity-30 shadow-neon">
          <p className="text-sm md:text-base text-gray-200">{response}</p>
        </div>
      )}
    </div>
  );
};

export default CharacterAnimation;