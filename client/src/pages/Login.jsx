import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Toast, Tabs } from 'antd-mobile'
import { auth } from '../api'

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);

  const onLogin = async (values) => {
    setLoading(true);
    try {
      const res = await auth.login(values);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      Toast.show({ icon: 'success', content: '登录成功' });
      navigate('/', { replace: true });
    } catch (err) {
      Toast.show({ icon: 'fail', content: err.message || '登录失败' });
    }
    setLoading(false);
  };

  const onRegister = async (values) => {
    setLoading(true);
    try {
      const res = await auth.register(values);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      Toast.show({ icon: 'success', content: '注册成功' });
      navigate('/', { replace: true });
    } catch (err) {
      Toast.show({ icon: 'fail', content: err.message || '注册失败' });
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(180deg, #4F6EF7 0%, #7B9CFF 40%, #F4F6FA 40%)',
      padding: '0 24px', display: 'flex', flexDirection: 'column'
    }}>
      {/* Logo Area */}
      <div style={{ textAlign: 'center', paddingTop: 80, paddingBottom: 40, color: '#fff' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24, background: 'rgba(255,255,255,0.2)',
          backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: 40
        }}>🏠</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>家庭智能储物</h1>
        <p style={{ opacity: 0.8, fontSize: 14 }}>轻松管理家中每一件物品</p>
      </div>

      {/* Form Card */}
      <div style={{
        background: '#fff', borderRadius: 24, padding: '8px 0',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)', flex: 1
      }}>
        <Tabs activeKey={tab} onChange={setTab} style={{ '--title-font-size': '15px' }}>
          <Tabs.Tab title="登录" key="login">
            <div style={{ padding: '8px 20px 20px' }}>
              <Form onFinish={onLogin} footer={
                <Button block type="submit" color="primary" size="large" loading={loading}
                  style={{ marginTop: 12, height: 48, borderRadius: 14, fontSize: 16, fontWeight: 700 }}>
                  登录
                </Button>
              } layout="vertical">
                <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
                  <Input placeholder="请输入用户名" style={{ '--font-size': '15px' }} />
                </Form.Item>
                <Form.Item name="password" label="密码" rules={[{ required: true }]}>
                  <Input type="password" placeholder="请输入密码" style={{ '--font-size': '15px' }} />
                </Form.Item>
              </Form>
            </div>
          </Tabs.Tab>
          <Tabs.Tab title="注册" key="register">
            <div style={{ padding: '8px 20px 20px' }}>
              <Form onFinish={onRegister} footer={
                <Button block type="submit" color="primary" size="large" loading={loading}
                  style={{ marginTop: 12, height: 48, borderRadius: 14, fontSize: 16, fontWeight: 700 }}>
                  注册
                </Button>
              } layout="vertical">
                <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
                  <Input placeholder="请输入用户名" style={{ '--font-size': '15px' }} />
                </Form.Item>
                <Form.Item name="nickname" label="昵称">
                  <Input placeholder="请输入昵称" style={{ '--font-size': '15px' }} />
                </Form.Item>
                <Form.Item name="password" label="密码" rules={[{ required: true }]}>
                  <Input type="password" placeholder="请输入密码" style={{ '--font-size': '15px' }} />
                </Form.Item>
              </Form>
            </div>
          </Tabs.Tab>
        </Tabs>
      </div>

      <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-hint)', fontSize: 12 }}>
        家庭智能储物系统 v1.0
      </div>
    </div>
  );
}
