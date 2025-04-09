/** @type {import('next').NextConfig} */
const nextConfig = {
  // 简化配置，解决routes-manifest.json错误
  
  // 确保不使用静态导出模式
  // output: 'export', 
  
  images: {
    unoptimized: true,
  },
  
  // 禁用严格模式以避免开发环境中的双重渲染
  reactStrictMode: false,
}

module.exports = nextConfig