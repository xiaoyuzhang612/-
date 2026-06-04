import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Dialog, Toast, Input } from 'antd-mobile'
import { auth } from '../api'

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    const cached = localStorage.getItem('user');
    if (cached) { try { const u = JSON.parse(cached); setUser(u); setForm(u); } catch(e) {} }
    auth.getProfile().then(res => {
      setUser(res.data); setForm(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
    }).catch(() => {
      if (!cached) { localStorage.clear(); navigate('/login', { replace: true }); }
    });
  }, []);

  const handleSave = async () => {
    await auth.updateProfile(form);
    Toast.show({ icon: 'success', content: '更新成功' });
    setUser({ ...user, ...form });
    localStorage.setItem('user', JSON.stringify({ ...user, ...form }));
    setEditing(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      Toast.show({ content: '图片不能超过2MB' }); return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      try {
        const res = await auth.uploadAvatar(dataUrl);
        const newAvatar = res.data.avatar;
        setUser(u => ({ ...u, avatar: newAvatar }));
        setForm(f => ({ ...f, avatar: newAvatar }));
        localStorage.setItem('user', JSON.stringify({ ...user, avatar: newAvatar }));
        Toast.show({ icon: 'success', content: '头像更新成功' });
      } catch { Toast.show({ icon: 'fail', content: '上传失败' }); }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleLogout = async () => {
    const result = await Dialog.confirm({ content: '确定退出登录？' });
    if (result) { localStorage.clear(); navigate('/login', { replace: true }); }
  };

  if (!user) return (
    <div style={{ textAlign: 'center', paddingTop: 120 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
      <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>需要重新登录</h3>
      <p style={{ color: 'var(--text-hint)', fontSize: 14, marginBottom: 24 }}>登录状态已过期</p>
      <Button color="primary" style={{ borderRadius: 12, padding: '0 32px', height: 44, fontWeight: 600 }}
        onClick={() => { localStorage.clear(); navigate('/login', { replace: true }); }}>去登录</Button>
    </div>
  );

  const menuItems = [
    { icon: '💊', label: '药箱', desc: '药品与医疗用品', action: () => navigate('/storage/medicine') },
    { icon: '🧴', label: '日化', desc: '日化洗护用品', action: () => navigate('/storage/daily') },
    { icon: '📦', label: '自定义存储', desc: '自定义分类管理', action: () => navigate('/storage/custom') },
    { icon: '📂', label: '分类管理', desc: '管理物品分类', action: () => navigate('/categories') },
    { icon: '👨‍👩‍👧‍👦', label: '家庭管理', desc: '家庭成员与权限', action: () => navigate('/family') },
    { icon: '📊', label: '数据统计', desc: '查看存储数据', action: () => navigate('/stats') },
  ];

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, letterSpacing: '-0.3px' }}>我的</h2>

      {/* Profile Card */}
      <div className="profile-header" style={{ padding: '20px 16px' }}>
        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

        {/* Avatar row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
          <div onClick={handleAvatarClick} style={{
            width: 56, height: 56, borderRadius: 16, flexShrink: 0, cursor: 'pointer',
            background: user.avatar ? `url(${user.avatar}) center/cover` : 'var(--primary-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', boxShadow: '0 2px 8px rgba(79,110,247,0.25)'
          }}>
            {!user.avatar && <span style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>
              {(user.nickname || user.username || '?')[0].toUpperCase()}
            </span>}
            {/* Camera icon overlay */}
            <div style={{
              position: 'absolute', bottom: -2, right: -2, width: 20, height: 20,
              borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)', fontSize: 11
            }}>📷</div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <div>
                <Input placeholder="昵称" value={form.nickname}
                  onChange={v => setForm(f => ({ ...f, nickname: v }))}
                  style={{ '--font-size': '14px', marginBottom: 6 }} />
                <Input placeholder="手机号" value={form.phone}
                  onChange={v => setForm(f => ({ ...f, phone: v }))}
                  style={{ '--font-size': '14px', marginBottom: 6 }} />
                <Input placeholder="默认地址" value={form.default_address}
                  onChange={v => setForm(f => ({ ...f, default_address: v }))}
                  style={{ '--font-size': '14px', marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button size="mini" color="primary" onClick={handleSave} style={{ borderRadius: 6 }}>保存</Button>
                  <Button size="mini" onClick={() => { setEditing(false); setForm(user); }} style={{ borderRadius: 6 }}>取消</Button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.3 }}>{user.nickname || user.username}</div>
                <div style={{ color: 'var(--text-hint)', fontSize: 12, marginTop: 1 }}>@{user.username}</div>
                {user.phone && <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>📱 {user.phone}</div>}
              </>
            )}
          </div>

          {!editing && (
            <Button size="mini" color="primary" fill="outline"
              style={{ borderRadius: 8, fontWeight: 600, flexShrink: 0 }}
              onClick={() => setEditing(true)}>编辑</Button>
          )}
        </div>

        <div style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 8, textAlign: 'center' }}>
          点击头像可更换照片
        </div>
      </div>

      {/* Menu List */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)', overflow: 'hidden', marginBottom: 16
      }}>
        {menuItems.map((item, i) => (
          <div key={i} onClick={item.action} style={{
            display: 'flex', alignItems: 'center', padding: '14px 16px',
            borderBottom: i < menuItems.length - 1 ? '1px solid #F3F4F6' : 'none',
            cursor: 'pointer'
          }}>
            <span style={{ fontSize: 22, marginRight: 12 }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-hint)', marginTop: 1 }}>{item.desc}</div>
            </div>
            <span style={{ color: 'var(--text-hint)', fontSize: 14 }}>›</span>
          </div>
        ))}
      </div>

      <Button block color="danger" fill="outline" onClick={handleLogout}
        style={{ height: 44, borderRadius: 12, fontWeight: 600, marginBottom: 16 }}>退出登录</Button>

      <div style={{ textAlign: 'center', color: '#D1D5DB', fontSize: 12, paddingBottom: 20 }}>
        家庭智能储物系统 v1.0
      </div>
    </div>
  );
}
