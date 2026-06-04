import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Grid, NoticeBar, SearchBar, Dialog, Toast } from 'antd-mobile'
import { stats, boxes as boxesApi, search, families, reminders } from '../api'

export default function Home() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [allBoxes, setAllBoxes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [familyInfo, setFamilyInfo] = useState(null);
  const [reminderList, setReminderList] = useState([]);

  useEffect(() => {
    stats.get({}).then(res => setData(res.data)).catch(() => {});
    boxesApi.listHome().then(res => setAllBoxes(res.data || [])).catch(() => {});
    families.list().then(res => {
      if (res.data?.length > 0) {
        families.get(res.data[0].id).then(r => {
          setFamilyInfo(r.data);
          // Load reminders
          reminders.list({ family_id: res.data[0].id }).then(rem => setReminderList(rem.data || [])).catch(() => {});
        }).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleSearch = async (q) => {
    if (!q.trim()) { setSearchResults(null); return; }
    try { setSearchResults((await search.query({ q })).data); } catch (e) { setSearchResults(null); }
  };

  const dismissReminder = async (id) => {
    await reminders.dismiss(id);
    setReminderList(prev => prev.filter(r => r.id !== id));
  };

  const handleDeleteBox = async (box) => {
    const result = await Dialog.confirm({ content: `删除箱子「${box.name}」？箱内物品不会被删除。` });
    if (result) {
      await boxesApi.delete(box.id);
      Toast.show({ icon: 'success', content: '已删除' });
      boxesApi.listHome().then(res => setAllBoxes(res.data || [])).catch(() => {});
    }
  };

  const quickActions = [
    { icon: '💊', label: '添加药品', bg: '#FEF2F2', action: () => navigate('/items/new?type=medicine') },
    { icon: '🧴', label: '添加日化', bg: '#ECFDF5', action: () => navigate('/items/new?type=daily') },
    { icon: '📦', label: '添加物品', bg: '#EEF1FE', action: () => navigate('/items/new') },
    { icon: '📊', label: '统计', bg: '#F5F3FF', action: () => navigate('/stats') },
  ];

  const reminderIcons = {
    medicine: '💊',
    daily: '🧴',
    expiry: '⏰',
    general: '📌'
  };

  return (
    <div>
      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, #4F6EF7 0%, #7B9CFF 50%, #A5B4FC 100%)',
        color: '#fff', padding: '24px 20px 28px', borderRadius: '0 0 24px 24px',
        margin: '-16px -16px 20px', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -30, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', bottom: -40, right: 40, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 2 }}>
            {user.nickname || user.username || '你好'}
          </h1>
          <p style={{ opacity: 0.7, fontSize: 13 }}>家庭智能储物系统</p>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: 16 }}>
        <SearchBar placeholder="搜索物品名称、品牌、标签..." value={searchQuery}
          onChange={setSearchQuery} onSearch={handleSearch} onClear={() => setSearchResults(null)}
          style={{ '--background': 'var(--bg-card)', '--border-radius': '12px', '--height': '40px' }} />
      </div>

      {/* Search Results */}
      {searchResults && (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '16px',
          boxShadow: 'var(--shadow-sm)', marginBottom: 16
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
            搜索结果 ({searchResults.length})
          </div>
          {searchResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-hint)', fontSize: 14 }}>
              没有找到相关物品
            </div>
          ) : (
            searchResults.slice(0, 5).map(item => (
              <div key={item.id} onClick={() => navigate(`/items/${item.id}`)}
                style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-hint)', marginTop: 2 }}>
                    {item.category_name || '未分类'}{item.brand && ` · ${item.brand}`}
                  </div>
                </div>
                <span style={{ color: 'var(--primary)', fontSize: 12 }}>查看 ›</span>
              </div>
            ))
          )}
          {searchResults.length > 5 && (
            <div onClick={() => navigate('/items')}
              style={{ textAlign: 'center', padding: '12px 0 4px', color: 'var(--primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              查看全部 {searchResults.length} 个结果 ›
            </div>
          )}
        </div>
      )}

      {/* Family Card - Enhanced */}
      {familyInfo && (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '16px',
          boxShadow: 'var(--shadow-sm)', marginBottom: 16
        }}>
          <div onClick={() => navigate(`/families/${familyInfo.id}`)} style={{ cursor: 'pointer', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28 }}>👨‍👩‍👧</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{familyInfo.name}</div>
                {familyInfo.address && <div style={{ fontSize: 12, color: 'var(--text-hint)', marginTop: 2 }}>{familyInfo.address}</div>}
              </div>
            </div>
          </div>

          {/* Member Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            {(familyInfo.members || []).map(m => (
              <div key={m.id} onClick={() => navigate(`/members/${m.id}/items`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
                  background: '#F8F9FC', borderRadius: 12, cursor: 'pointer',
                  transition: 'all 0.15s'
                }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'var(--primary-gradient)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, flexShrink: 0
                }}>{(m.nickname || m.username || '?')[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{m.nickname || m.username}</span>
                    {m.tag && <span style={{
                      background: 'var(--primary-light)', color: 'var(--primary)',
                      padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 500
                    }}>{m.tag}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                    {m.age && <span>{m.age}岁</span>}
                    {m.gender && <span>{m.gender}</span>}
                    <span>📦 {m.item_count || 0} 件物品</span>
                  </div>
                  {m.health_info && (
                    <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>💡</span> {m.health_info}
                    </div>
                  )}
                </div>
                <span style={{ color: 'var(--text-hint)', fontSize: 16 }}>›</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)', paddingTop: 8, borderTop: '1px solid #F3F4F6', flexWrap: 'wrap' }}>
            <span>👤 {familyInfo.stats?.member_count || 0} 位成员</span>
            <span>📦 {allBoxes.length || 0} 个储物箱</span>
            <span>🏷️ {familyInfo.stats?.item_type_count || 0} 种 · {familyInfo.stats?.item_total_count || 0} 件</span>
          </div>
        </div>
      )}

      {/* Reminder Module */}
      {reminderList.length > 0 && (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '16px',
          boxShadow: 'var(--shadow-sm)', marginBottom: 16
        }}>
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🔔</span> 智能提醒
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-hint)' }}>{reminderList.length} 条提醒</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reminderList.slice(0, 5).map(r => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                background: r.type === 'expiry' ? '#FEF2F2' : r.type === 'medicine' ? '#FFF7ED' : '#F0F9FF',
                borderRadius: 10, position: 'relative'
              }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{reminderIcons[r.type] || '📌'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{r.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.content}</div>
                </div>
                <span onClick={() => dismissReminder(r.id)} style={{
                  fontSize: 11, color: 'var(--text-hint)', cursor: 'pointer', padding: '2px 6px',
                  borderRadius: 4, flexShrink: 0, background: 'rgba(0,0,0,0.04)'
                }}>关闭</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expiry Alert */}
      {data?.expiringSoon?.length > 0 && (
        <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden' }}>
          <NoticeBar content={`${data.expiringSoon.length} 件物品即将过期，请及时处理`} color="alert"
            onClick={() => navigate('/stats')} />
        </div>
      )}

      {/* Storage Boxes */}
      <div style={{ marginBottom: 24 }}>
        <div className="flex-between" style={{ paddingLeft: 2, marginBottom: 14 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>储物箱</div>
          <span onClick={() => navigate('/modules')} style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>全部箱子 ›</span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {allBoxes.slice(0, 6).map(box => {
            const navigateTo = box.is_builtin ? `/storage/${box.id}` : `/boxes/${box.id}`;
            const addPath = box.is_builtin ? `/items/new?type=${box.id}` : `/items/new?module=${box.real_id}`;
            return (
              <div key={box.id} className="module-card" style={{
                background: `linear-gradient(145deg, ${box.color}18 0%, ${box.color}08 100%)`,
                boxShadow: `0 4px 16px ${box.color}18`, padding: '16px 12px 10px', minWidth: 0, flex: '1 1 0',
                position: 'relative'
              }}>
                {!box.is_builtin && (
                  <span onClick={(e) => { e.stopPropagation(); handleDeleteBox(box); }}
                    style={{
                      position: 'absolute', top: 6, right: 6, width: 20, height: 20,
                      borderRadius: '50%', background: 'rgba(0,0,0,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', fontSize: 11, color: '#9CA3AF', lineHeight: 1
                    }}>✕</span>
                )}
                <div onClick={() => navigate(navigateTo)} style={{ cursor: 'pointer' }}>
                  <span className="module-icon">{box.icon}</span>
                  <div className="module-title" style={{ color: box.color }}>{box.name}</div>
                  <div className="module-count" style={{ color: box.color, marginBottom: 10 }}>{box.item_count || 0} 种</div>
                </div>
                <div onClick={(e) => { e.stopPropagation(); navigate(addPath); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                    padding: '5px 0', borderRadius: 8, cursor: 'pointer',
                    background: `${box.color}15`, color: box.color,
                    fontSize: 12, fontWeight: 600
                  }}>
                  <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> 添加
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 24 }}>
        <div className="section-title" style={{ paddingLeft: 2 }}>快捷操作</div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '16px 8px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {quickActions.map((a, i) => (
            <div key={i} className="quick-action" onClick={a.action}>
              <div className="action-icon" style={{ background: a.bg }}>{a.icon}</div>
              <div className="action-label">{a.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '20px',
        boxShadow: 'var(--shadow-sm)', marginBottom: 20
      }}>
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>数据概览</div>
          <span style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            onClick={() => navigate('/stats')}>查看全部 →</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div onClick={() => navigate('/stats?filter=expired')} style={{
            textAlign: 'center', padding: '14px 8px', cursor: 'pointer',
            background: '#FEF2F2', borderRadius: 12
          }}>
            <div className="stat-number" style={{ color: '#EF4444', fontSize: 24 }}>{data?.expiredCount || 0}</div>
            <div className="stat-label" style={{ color: '#EF4444' }}>已过期</div>
          </div>
          <div onClick={() => navigate('/stats?filter=expiring')} style={{
            textAlign: 'center', padding: '14px 8px', cursor: 'pointer',
            background: '#FFFBEB', borderRadius: 12
          }}>
            <div className="stat-number" style={{ color: '#F59E0B', fontSize: 24 }}>{data?.expiringSoonCount || 0}</div>
            <div className="stat-label" style={{ color: '#F59E0B' }}>快过期</div>
          </div>
          <div onClick={() => navigate('/stats?filter=lowstock')} style={{
            textAlign: 'center', padding: '14px 8px', cursor: 'pointer',
            background: '#FFF7ED', borderRadius: 12
          }}>
            <div className="stat-number" style={{ color: '#EA580C', fontSize: 24 }}>{data?.lowStockCount || 0}</div>
            <div className="stat-label" style={{ color: '#EA580C' }}>需补货</div>
          </div>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12, paddingTop: 12,
          borderTop: '1px solid #F3F4F6', fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap'
        }}>
          <span>📦 {allBoxes.length || 0} 个储物箱</span>
          <span>📋 {data?.itemCount || 0} 种 · {data?.totalQuantity || 0} 件</span>
        </div>
      </div>

      {/* Category Distribution */}
      {data?.categoryDistribution?.length > 0 && (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '20px',
          boxShadow: 'var(--shadow-sm)', marginBottom: 20
        }}>
          <div className="section-title">分类分布</div>
          {data.categoryDistribution.slice(0, 5).map((cat, i) => {
            const colors = ['#4F6EF7', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
            const pct = Math.min(100, (cat.count / (data.itemCount || 1)) * 100);
            return (
              <div key={i} style={{ marginBottom: 12 }}>
                <div className="flex-between" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{cat.name}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-hint)', fontWeight: 600 }}>{cat.count}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${pct}%`, background: colors[i % 5] }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!data && (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🏠</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>欢迎使用家庭智能储物</h3>
          <p style={{ color: 'var(--text-hint)', fontSize: 14, lineHeight: 1.6 }}>
            选择上方模块开始管理您的物品
          </p>
        </div>
      )}
    </div>
  );
}
