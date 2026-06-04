import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FloatingBubble, SwipeAction, Dialog, Toast, Checkbox, Button, Popup } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { items as itemsApi, modules as modulesApi, boxes as boxesApi } from '../api'

const statusMap = {
  in_use: { text: '使用中', color: '#10B981' },
  discarded: { text: '已丢弃', color: '#F59E0B' },
  donated: { text: '已捐赠', color: '#8B5CF6' },
  lent: { text: '已借出', color: '#6B7280' },
  expired: { text: '已过期', color: '#EF4444' },
  damaged: { text: '已损坏', color: '#F97316' },
};

const defaultModules = [
  { key: 'medicine', name: '药箱', icon: '💊', color: '#EF4444', bg: 'linear-gradient(145deg, #FEF2F2 0%, #FECACA 100%)', type: 'builtin' },
  { key: 'daily', name: '日化', icon: '🧴', color: '#10B981', bg: 'linear-gradient(145deg, #ECFDF5 0%, #A7F3D0 100%)', type: 'builtin' },
];

export default function ItemsManagement() {
  const navigate = useNavigate();

  // Restore saved module from localStorage
  const savedModule = (() => {
    try {
      const saved = localStorage.getItem('lastModule');
      if (!saved) return null;
      const mod = JSON.parse(saved);
      // Fix old data: modules with 'key' but no 'type' are builtin
      if (mod && mod.key && !mod.type) mod.type = 'builtin';
      return mod;
    } catch { return null; }
  })();

  const [currentModule, setCurrentModule] = useState(savedModule);
  const [showPicker, setShowPicker] = useState(!savedModule);
  const [customModules, setCustomModules] = useState([]);
  const [items, setItems] = useState([]);
  const [allBoxes, setAllBoxes] = useState([]);

  // Batch mode state
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [showMovePopup, setShowMovePopup] = useState(false);

  useEffect(() => {
    modulesApi.list().then(res => setCustomModules(res.data)).catch(() => {});
    boxesApi.list().then(res => setAllBoxes(res.data || [])).catch(() => {});
  }, []);

  // Save module selection to localStorage
  const selectModule = (mod) => {
    setCurrentModule(mod);
    setShowPicker(false);
    localStorage.setItem('lastModule', JSON.stringify(mod));
  };

  const getBoxId = (mod) => {
    if (!mod) return null;
    return mod.type === 'builtin' ? mod.key : `custom_${mod.id}`;
  };

  useEffect(() => {
    if (!currentModule) return;
    boxesApi.get(getBoxId(currentModule)).then(res => setItems(res.data?.items || [])).catch(() => {
      // 箱子不存在（404），清除旧数据，重新选择
      setCurrentModule(null);
      setShowPicker(true);
      localStorage.removeItem('lastModule');
      setItems([]);
    });
  }, [currentModule]);

  const refreshItems = () => {
    if (!currentModule) return;
    boxesApi.get(getBoxId(currentModule)).then(res => setItems(res.data?.items || [])).catch(() => {});
  };

  const handleDelete = async (id) => {
    const result = await Dialog.confirm({ content: '确定删除这个物品吗？' });
    if (result) {
      await itemsApi.delete(id);
      Toast.show({ icon: 'success', content: '删除成功' });
      refreshItems();
    }
  };

  // Batch operations
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  const exitBatchMode = () => {
    setBatchMode(false);
    setSelectedIds(new Set());
    setShowBatchActions(false);
  };

  const handleBatchDelete = async () => {
    const count = selectedIds.size;
    const result = await Dialog.confirm({ content: `确定删除选中的 ${count} 个物品？` });
    if (result) {
      await Promise.all([...selectedIds].map(id => itemsApi.delete(id)));
      Toast.show({ icon: 'success', content: `已删除 ${count} 个物品` });
      exitBatchMode();
      refreshItems();
    }
  };

  const handleBatchStatus = async (status) => {
    const count = selectedIds.size;
    const statusName = statusMap[status]?.text || status;
    const result = await Dialog.confirm({ content: `确定将选中的 ${count} 个物品状态改为「${statusName}」？` });
    if (result) {
      await Promise.all([...selectedIds].map(id => {
        const item = items.find(i => i.id === id);
        return itemsApi.update(id, { ...item, status });
      }));
      Toast.show({ icon: 'success', content: `已更新 ${count} 个物品` });
      exitBatchMode();
      refreshItems();
    }
  };

  const handleBatchMove = async (targetBoxId) => {
    const count = selectedIds.size;
    const targetBox = allBoxes.find(b => b.id === targetBoxId);
    const result = await Dialog.confirm({ content: `确定将选中的 ${count} 个物品移到「${targetBox?.name}」？` });
    if (result) {
      const isCustom = targetBoxId.startsWith('custom_');
      const moduleId = isCustom ? targetBox?.real_id : null;
      const storageType = isCustom ? 'custom' : targetBoxId;
      await Promise.all([...selectedIds].map(id => {
        const item = items.find(i => i.id === id);
        return itemsApi.update(id, { ...item, storage_type: storageType, module_id: moduleId });
      }));
      Toast.show({ icon: 'success', content: `已移动 ${count} 个物品` });
      setShowMovePopup(false);
      exitBatchMode();
      refreshItems();
    }
  };

  const allModules = [
    ...defaultModules.map(m => ({ ...m, type: 'builtin' })),
    ...customModules.map(m => ({ ...m, type: 'custom' })),
  ];

  const color = currentModule?.color || '#4F6EF7';
  const allSelected = items.length > 0 && selectedIds.size === items.length;

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Mode Picker Overlay */}
      {showPicker && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease'
        }} onClick={() => { if (currentModule) setShowPicker(false); }}>
          <div style={{
            background: '#fff', borderRadius: 24, padding: '28px 20px 24px',
            width: '85%', maxWidth: 340, position: 'relative',
            animation: 'slideUp 0.3s ease'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1F2937' }}>选择仓库</div>
              <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>进入对应仓库管理物品</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {defaultModules.map(m => (
                <div key={m.key} onClick={() => selectModule(m)}
                  style={{
                    background: m.bg, borderRadius: 16, padding: '16px 8px 12px',
                    textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s',
                    border: currentModule?.key === m.key ? `2px solid ${m.color}` : '2px solid transparent',
                    boxShadow: currentModule?.key === m.key ? `0 4px 16px ${m.color}30` : '0 2px 8px rgba(0,0,0,0.06)'
                  }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>{m.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.name}</div>
                </div>
              ))}
            </div>

            {customModules.length > 0 && (
              <>
                <div style={{
                  fontSize: 12, color: '#9CA3AF', fontWeight: 600,
                  margin: '18px 0 10px', letterSpacing: '0.5px'
                }}>自定义仓库</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {customModules.map(m => (
                    <div key={m.id} onClick={() => selectModule({ ...m, type: 'custom' })}
                      style={{
                        background: `linear-gradient(145deg, ${m.color}18 0%, ${m.color}08 100%)`,
                        borderRadius: 16, padding: '16px 8px 12px',
                        textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s',
                        border: currentModule?.id === m.id ? `2px solid ${m.color}` : '2px solid transparent',
                        boxShadow: currentModule?.id === m.id ? `0 4px 16px ${m.color}30` : '0 2px 8px rgba(0,0,0,0.06)'
                      }}>
                      <div style={{ fontSize: 32, marginBottom: 6 }}>{m.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.name}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div onClick={() => setShowPicker(false)}
              style={{ textAlign: 'center', marginTop: 16, color: '#9CA3AF', fontSize: 13, cursor: 'pointer' }}>
              暂不选择，稍后查看
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        background: currentModule
          ? `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`
          : 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)',
        color: '#fff', padding: '20px 16px 24px', borderRadius: '0 0 24px 24px',
        margin: '-16px -16px 16px', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -30, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', bottom: -40, right: 40, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>物品管理</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 28 }}>{currentModule?.icon || '📦'}</span>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
                  {currentModule?.name || '请选择仓库'}
                </h2>
                <p style={{ opacity: 0.7, fontSize: 13, margin: '2px 0 0' }}>
                  {currentModule ? `${items.length} 种物品` : '点击右上角切换仓库'}
                </p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Batch Mode Button */}
            {currentModule && (
              <div onClick={() => { setBatchMode(!batchMode); if (batchMode) exitBatchMode(); }} style={{
                width: 44, height: 44, borderRadius: 14,
                background: batchMode ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s',
                border: '1px solid rgba(255,255,255,0.3)'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
              </div>
            )}
            {/* Mode Switcher Button */}
            <div onClick={() => setShowPicker(true)} style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
              border: '1px solid rgba(255,255,255,0.3)'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Batch mode toolbar */}
      {currentModule && batchMode && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', marginBottom: 12, borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Checkbox checked={allSelected} onChange={toggleSelectAll} style={{ '--icon-size': '20px' }}>
              <span style={{ fontSize: 13 }}>全选</span>
            </Checkbox>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              已选 {selectedIds.size} 项
            </span>
          </div>
          {selectedIds.size > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              <Button size="mini" color="danger" fill="outline" onClick={handleBatchDelete}>删除</Button>
              <Button size="mini" color="warning" fill="outline" onClick={() => setShowBatchActions(!showBatchActions)}>状态</Button>
              <Button size="mini" color="primary" fill="outline" onClick={() => setShowMovePopup(true)}>移动</Button>
            </div>
          )}
        </div>
      )}

      {/* Batch status actions */}
      {currentModule && batchMode && showBatchActions && selectedIds.size > 0 && (
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, padding: '10px 12px',
          borderRadius: 'var(--radius-md)', background: '#F8F9FB'
        }}>
          {Object.entries(statusMap).map(([key, val]) => (
            <span key={key} onClick={() => handleBatchStatus(key)} style={{
              padding: '5px 12px', borderRadius: 16, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', background: '#fff', border: '1px solid #E5E7EB'
            }}>{val.text}</span>
          ))}
        </div>
      )}

      {/* Move popup */}
      <Popup visible={showMovePopup} onMaskClick={() => setShowMovePopup(false)} bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '20px 16px' }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>移动到箱子</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {allBoxes.filter(b => currentModule?.type === 'builtin' ? b.id !== currentModule.key : b.id !== `custom_${currentModule?.id}`).map(b => (
            <div key={b.id} onClick={() => handleBatchMove(b.id)} style={{
              textAlign: 'center', padding: '16px 14px', borderRadius: 12, cursor: 'pointer',
              background: '#F4F6FA', border: '2px solid transparent', minWidth: 80
            }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>{b.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{b.name}</div>
            </div>
          ))}
        </div>
      </Popup>

      {/* Items List */}
      {!currentModule ? (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>📦</div>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>请选择仓库</h3>
          <p style={{ color: 'var(--text-hint)', fontSize: 14, marginBottom: 20 }}>
            点击右上角按钮选择要管理的仓库
          </p>
          <div onClick={() => setShowPicker(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'linear-gradient(135deg, #4F6EF7 0%, #7B9CFF 100%)',
            color: '#fff', padding: '10px 24px', borderRadius: 24, fontWeight: 600,
            fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 14px #4F6EF740'
          }}>选择仓库</div>
        </div>
      ) : items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>{currentModule.icon}</div>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>仓库是空的</h3>
          <p style={{ color: 'var(--text-hint)', fontSize: 14, marginBottom: 20 }}>
            点击下方按钮添加第一个物品
          </p>
          <div onClick={() => {
            const params = currentModule.type === 'builtin' ? `type=${currentModule.key}` : `module=${currentModule.id}`;
            navigate(`/items/new?${params}`);
          }} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
            color: '#fff', padding: '10px 24px', borderRadius: 24, fontWeight: 600,
            fontSize: 14, cursor: 'pointer', boxShadow: `0 4px 14px ${color}40`
          }}>+ 添加物品</div>
        </div>
      ) : (
        items.map(item => (
          <SwipeAction key={item.id} rightActions={batchMode ? [] : [
            { key: 'delete', text: '删除', color: 'danger', onClick: () => handleDelete(item.id) }
          ]}>
            <div className="list-item-card" onClick={() => batchMode ? toggleSelect(item.id) : navigate(`/items/${item.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {batchMode && (
                  <div style={{ marginRight: 10, flexShrink: 0 }}>
                    <Checkbox checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} style={{ '--icon-size': '20px' }} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-hint)' }}>
                    {item.category_name || '未分类'}
                    {item.brand && ` · ${item.brand}`}
                    {item.quantity > 1 && ` · ${item.quantity}${item.unit || '个'}`}
                  </div>
                  {item.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                      {item.tags.slice(0, 3).map((t, i) => (
                        <span key={i} style={{
                          background: `${color}12`, color: color, padding: '2px 8px',
                          borderRadius: 10, fontSize: 11, fontWeight: 500
                        }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                  background: `${statusMap[item.status]?.color || '#6B7280'}15`,
                  color: statusMap[item.status]?.color || '#6B7280',
                  flexShrink: 0, marginLeft: 8
                }}>
                  {statusMap[item.status]?.text || item.status}
                </span>
              </div>
            </div>
          </SwipeAction>
        ))
      )}

      {/* Add Button */}
      {currentModule && (
        <FloatingBubble style={{
          '--initial-position-bottom': '80px', '--initial-position-right': '16px', '--edge-distance': '16px'
        }} onClick={() => {
          const params = currentModule.type === 'builtin' ? `type=${currentModule.key}` : `module=${currentModule.id}`;
          navigate(`/items/new?${params}`);
        }}>
          <AddOutline fontSize={24} />
        </FloatingBubble>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
}
