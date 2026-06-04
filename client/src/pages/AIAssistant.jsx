import React, { useState, useRef, useEffect } from 'react'
import { Input, Button, SafeArea, Dialog, Toast } from 'antd-mobile'
import { ai, items } from '../api'
import { Html5Qrcode } from 'html5-qrcode'

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '哈喽！我是你的家庭储物助手。今天需要帮你记录新买的物品，还是查找家里的库存？随时告诉我，让我们一起把家变得井井有条。' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const listRef = useRef(null);
  const fileInputRef = useRef(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);
    try {
      const res = await ai.chat(msg);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch { setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，暂时无法处理您的请求。' }]); }
    setLoading(false);
  };

  // 压缩图片为base64
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 800;
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            if (width > height) { height = (height / width) * maxSize; width = maxSize; }
            else { width = (width / height) * maxSize; height = maxSize; }
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // 拍照识图
  const handlePhotoCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const base64 = await compressImage(file);
    setMessages(prev => [...prev, { role: 'user', content: '[图片]', image: base64 }]);
    setLoading(true);

    try {
      const res = await ai.analyzeImage(base64);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '图片识别失败，请稍后再试。' }]);
    }
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 打开扫码器
  const startScanner = async () => {
    setScannerVisible(true);
  };

  // 扫码器 DOM 渲染后初始化摄像头
  useEffect(() => {
    if (!scannerVisible || html5QrCodeRef.current) return;
    const timer = setTimeout(async () => {
      try {
        // 先请求摄像头权限
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        stream.getTracks().forEach(t => t.stop());

        const html5QrCode = new Html5Qrcode('qr-reader');
        html5QrCodeRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            stopScanner();
            handleScanResult(decodedText);
          },
          () => {}
        );
      } catch (err) {
        console.error('启动扫码失败:', err);
        setScannerVisible(false);
        html5QrCodeRef.current = null;
        const msg = err.name === 'NotAllowedError'
          ? '摄像头权限被拒绝，请在浏览器设置中允许摄像头访问。'
          : '无法启动摄像头：' + err.message;
        setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [scannerVisible]);

  // 停止扫码器
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {}
      html5QrCodeRef.current = null;
    }
    setScannerVisible(false);
  };

  // 打开药品查询网页
  const openDrugQuery = (code) => {
    const firstDigit = code.charAt(0);
    let url;
    if (firstDigit === '8') {
      url = `https://www.mashangfangxin.com/drugQueryResult?code=${code}`;
    } else if (['0', '1', '2', '3', '4'].includes(firstDigit)) {
      url = `https://www.mashangfangxin.com/rqQueryResult?code=${code}`;
    } else {
      url = `https://www.mashangfangxin.com/drugQueryResult?code=${code}`;
    }
    window.open(url, '_blank');
  };

  // 保存药品到物品库
  const saveDrugToInventory = async (code) => {
    const result = await Dialog.confirm({
      title: '保存到物品库',
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>追溯码: {code}</p>
          <p style={{ fontSize: 12, color: '#999' }}>请在平台查询后，输入药品名称保存</p>
        </div>
      ),
      confirmText: '去查询并保存',
      cancelText: '取消'
    });

    if (result) {
      // 先打开查询页面
      openDrugQuery(code);
      // 提示用户查询后回来输入名称
      Toast.show({ content: '请在平台查询药品名称后，返回此处输入', position: 'center' });
    }
  };

  // 处理扫码结果
  const handleScanResult = async (content) => {
    setMessages(prev => [...prev, { role: 'user', content: `📱 扫码：${content}` }]);
    setLoading(true);

    try {
      const res = await ai.processScanResult(content);
      const data = res.data;

      // 如果是药品追溯码，嵌入查询结果
      if (data.type === 'drug' && data.queryUrl) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.reply,
          drugQuery: { code: data.code, queryUrl: data.queryUrl }
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '处理扫码结果失败，请稍后再试。' }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.3px' }}>家庭储物助手</h2>

      {/* 功能入口卡片 */}
      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handlePhotoCapture} style={{ display: 'none' }} />
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div onClick={() => fileInputRef.current?.click()} style={{
          flex: 1, background: 'var(--primary-gradient)', borderRadius: 16, padding: '16px 12px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(79,110,247,0.25)', transition: 'transform 0.15s'
        }}>
          <span style={{ fontSize: 32 }}>📷</span>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>拍照识物</span>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>AI识别物品</span>
        </div>
        <div onClick={startScanner} style={{
          flex: 1, background: 'linear-gradient(135deg, #34D399 0%, #059669 100%)', borderRadius: 16, padding: '16px 12px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(52,211,153,0.25)', transition: 'transform 0.15s'
        }}>
          <span style={{ fontSize: 32 }}>📱</span>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>扫码查询</span>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>药品/条码</span>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={listRef} style={{ flex: 1, overflow: 'auto', paddingBottom: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
            {msg.role === 'assistant' && <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginRight: 8, flexShrink: 0 }}>🤖</div>}
            <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
              {msg.image && <img src={msg.image} alt="拍摄的图片" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 8, display: 'block' }} />}
              {msg.content}
              {msg.drugQuery && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div onClick={() => openDrugQuery(msg.drugQuery.code)} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1677FF', color: '#fff',
                    padding: '10px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(22,119,255,0.3)', justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: 18 }}>💊</span> 查询药品详情
                  </div>
                  <div onClick={() => saveDrugToInventory(msg.drugQuery.code)} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', color: 'var(--primary)',
                    padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    border: '1px solid var(--primary-light)', justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: 16 }}>📦</span> 保存到物品库
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginRight: 8, flexShrink: 0 }}>🤖</div>
            <div className="chat-bubble chat-bubble-assistant" style={{ color: 'var(--text-hint)' }}>
              <span style={{ animation: 'pulse 1.2s infinite' }}>思考中...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="chat-input-bar">
        <Input placeholder="输入消息..." value={input} onChange={setInput}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          style={{ flex: 1, '--border-radius': '24px', '--background': 'var(--bg-card)', '--padding-left': '16px' }} />
        <Button color="primary" onClick={() => sendMessage()} loading={loading} disabled={!input.trim()}
          style={{ borderRadius: 24, padding: '0 20px', height: 40, fontWeight: 600 }}>
          发送
        </Button>
      </div>
      <SafeArea position="bottom" />

      {/* 扫码全屏弹窗 */}
      {scannerVisible && (
        <div className="scanner-overlay">
          <div className="scanner-header">
            <span style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>扫描二维码/条形码</span>
            <span onClick={stopScanner} style={{ fontSize: 28, color: '#fff', cursor: 'pointer', lineHeight: 1 }}>✕</span>
          </div>
          <div id="qr-reader" ref={scannerRef} className="scanner-container" />
          <p style={{ color: '#fff', textAlign: 'center', marginTop: 16, fontSize: 14, opacity: 0.8 }}>
            将二维码/条形码放入框内自动扫描
          </p>
        </div>
      )}
    </div>
  );
}
