import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  // PWA相关代码在Vercel上可能导致问题，我们先注释掉
  /*
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').then(
          function(registration) {
            console.log('Service Worker 注册成功，范围为:', registration.scope);
          },
          function(err) {
            console.log('Service Worker 注册失败:', err);
          }
        );
      });
    }
  }, []);
  */

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#38bdf8" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;