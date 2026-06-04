import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Tag, FloatingBubble, SwipeAction, Dialog, Toast, Checkbox, Button, Popup, CheckList } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { items as itemsApi, categories, boxes as boxesApi } from '../api'

const builtinConfig = {
  medicine: { id: 'medicine', name: '药箱', icon: '💊', color: '#EF4444', is_builtin: true },
  daily: { id: 'daily', name: '日化', icon: '🧴', color: '#10B981', is_builtin: true },
};

const statusMap = {
  in_use: { text: '使用中', color: 'primary' },
  discarded: { text: '已丢弃', color: 'warning' },
  donated: { text: '已捐赠', color: 'success' },
  lent: { text: '已借出', color: 'default' },
  expired: { text: '已过期', color: 'danger' },
  damaged: { text: '已损坏', color: 'warning' },
};

export default function StorageModule() {
  const { type, id: boxId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isBoxRoute = location.pathname.startsWith('/boxes/');

  const [box, setBox] = useState(null);
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [filterCat, setFilterCat] = useState(null);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [allBoxes, setAllBoxes] = useState([]);

  // Batch mode state
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [showMovePopup, setShowMovePopup] = useState(false);

  // Determine current box config
  const currentBox = isBoxRoute ? box : builtinConfig[type];
  const color = currentBox?.color || '#4F6EF7';
  const icon = currentBox?.icon || '📦';
  const title = currentBox?.name || '储物箱';

  // Load box data
  useEffect(() => {
    if (isBoxRoute) {
      boxesApi.get(boxId).then(res => {
        setBox(res.data);
        setItems(res.data.items || []);
      }).catch(() => {});
    } else if (type) {
      const params = { storage_type: type };
      if (filterCat) params.category_id = filterCat;
      itemsApi.list(params).then(res => setItems(res.data || [])).catch(() => {});
    }
  }, [isBoxRoute, boxId, type, filterCat]);

  // Load categories for builtin types
  useEffect(() => {
    if (!isBoxRoute && type) {
      categories.list({ storage_type: type }).then(res => setCats(res.data)).catch(() => {});
    }
  }, [isBoxRoute, type]);

  // Load all boxes for switcher
  useEffect(() => {
    boxesApi.list().then(res => setAllBoxes(res.data || [])).catch(() => {});
  }, []);

  const handleDeleteItem = async (itemId) => {
    const result = await Dialog.confirm({ content: '确定删除这个物品吗？' });
    if (result) {
      await itemsApi.delete(itemId);
      Toast.show({ icon: 'success', content: '删除成功' });
      if (isBoxRoute) {
        boxesApi.get(boxId).then(res => { setBox(res.data); setItems(res.data.items || []); }).catch(() => {});
      } else {
        const params = { storage_type: type };
        if (filterCat) params.category_id = filterCat;
        itemsApi.list(params).then(res => setItems(res.data)).catch(() => {});
      }
    }
  };

  const handleDeleteBox = async () => {
    if (!box || box.is_builtin) return;
    const result = await Dialog.confirm({ content: `确定删除箱子「${box.name}」？箱内物品不会被删除。` });
    if (result) {
      await boxesApi.delete(box.id);
      Toast.show({ icon: 'success', content: '已删除' });
      navigate('/modules');
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

  const refreshItems = () => {
    if (isBoxRoute) {
      boxesApi.get(boxId).then(res => { setBox(res.data); setItems(res.data.items || []); }).catch(() => {});
    } else {
      const params = { storage_type: type };
      if (filterCat) params.category_id = filterCat;
      itemsApi.list(params).then(res => setItems(res.data)).catch(() => {});
    }
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

  const isExpired = (date) => date && new Date(date) < new Date();
  const lowStockItems = items.filter(i => i.quantity <= 1 && i.status === 'in_use' && i.unit !== '个');
  const allSelected = items.length > 0 && selectedIds.size === items.length;

  const addPath = isBoxRoute
    ? `/items/new?module=${box?.real_id}`
    : `/items/new?type=${type}`;

  return (
    <div>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
        color: '#fff', padding: '20px 16px 24px',
        borderRadius: '0 0 20px 20px', margin: '-16px -16px 16px', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -20, right: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <span style={{ cursor: 'pointer', marginRight: 12, fontSize: 18 }} onClick={() => navigate('/')}>←</span>
          <span style={{ fontSize: 36, marginRight: 10 }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{title}</h2>
            <p style={{ opacity: 0.8, fontSize: 13 }}>{items.length} 种物品</p>
          </div>
          {/* Switcher / Settings */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div onClick={() => { setBatchMode(!batchMode); if (batchMode) exitBatchMode(); }} style={{
              width: 40, height: 40, borderRadius: '50%', background: batchMode ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
            </div>
            <div onClick={() => setShowSwitcher(!showSwitcher)} style={{
              width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
              </svg>
            </div>
            {!currentBox?.is_builtin && isBoxRoute && (
              <div onClick={handleDeleteBox} style={{
                width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Switcher Popup */}
      {showSwitcher && (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '16px',
          boxShadow: 'var(--shadow-lg)', marginBottom: 16
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>切换箱子</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {allBoxes.map(b => {
              const active = isBoxRoute ? b.id === boxId : b.id === type;
              const navPath = b.is_builtin ? `/storage/${b.id}` : `/boxes/${b.id}`;
              return (
                <div key={b.id} onClick={() => { navigate(navPath); setShowSwitcher(false); }}
                  style={{
                    textAlign: 'center', padding: '14px 12px', borderRadius: 12, cursor: 'pointer',
                    background: active ? `${b.color}15` : '#F4F6FA',
                    border: active ? `2px solid ${b.color}` : '2px solid transparent',
                    minWidth: 72
                  }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{b.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: active ? b.color : 'var(--text-secondary)' }}>{b.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category filter (builtin only) */}
      {!isBoxRoute && cats.filter(c => c.storage_type === type).length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, paddingLeft: 2 }}>
          <span className={`cat-filter-tag ${!filterCat ? 'active' : ''}`}
            onClick={() => setFilterCat(null)}>全部</span>
          {cats.filter(c => c.storage_type === type).map(c => (
            <span key={c.id} className={`cat-filter-tag ${filterCat === c.id ? 'active' : ''}`}
              onClick={() => setFilterCat(c.id)}>{c.icon} {c.name}</span>
          ))}
          <span className="cat-filter-tag" onClick={() => navigate('/categories')}>+</span>
        </div>
      )}

      {/* Restock Reminder */}
      {lowStockItems.length > 0 && (
        <div style={{
          background: '#FFF7ED', borderRadius: 'var(--radius-md)', padding: '12px 16px',
          marginBottom: 14, border: '1px solid #FDBA74'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#EA580C' }}>补货提醒</span>
          </div>
          <div style={{ fontSize: 12, color: '#9A3412', lineHeight: 1.8 }}>
            {lowStockItems.slice(0, 5).map(item => (
              <div key={item.id} onClick={() => navigate(`/items/${item.id}`)} style={{ cursor: 'pointer' }}>
                • {item.name}（剩余 {item.quantity} {item.unit}）
              </div>
            ))}
            {lowStockItems.length > 5 && <div>...还有 {lowStockItems.length - 5} 件物品需要补货</div>}
          </div>
        </div>
      )}

      {/* Batch mode toolbar */}
      {batchMode && (
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
      {batchMode && showBatchActions && selectedIds.size > 0 && (
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
          {allBoxes.filter(b => isBoxRoute ? b.id !== boxId : b.id !== type).map(b => (
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

      {/* Item list */}
      {items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>{icon}</div>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{title}还是空的</h3>
          <p style={{ color: 'var(--text-hint)', fontSize: 14, marginBottom: 20 }}>点击下方按钮添加第一个物品</p>
          <div onClick={() => navigate(addPath)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
            color: '#fff', padding: '10px 24px', borderRadius: 24, fontWeight: 600,
            fontSize: 14, cursor: 'pointer', boxShadow: `0 4px 14px ${color}40`
          }}>+ 添加物品</div>
        </div>
      ) : (
        items.map(item => (
          <SwipeAction key={item.id} rightActions={batchMode ? [] : [
            { key: 'delete', text: '删除', color: 'danger', onClick: () => handleDeleteItem(item.id) }
          ]}>
            <div className="list-item-card" onClick={() => batchMode ? toggleSelect(item.id) : navigate(`/items/${item.id}`)}>
              <div className="flex-between">
                {batchMode && (
                  <div style={{ marginRight: 10, flexShrink: 0 }}>
                    <Checkbox checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} style={{ '--icon-size': '20px' }} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>
                    {item.category_icon && <span style={{ marginRight: 4 }}>{item.category_icon}</span>}
                    {item.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-hint)', marginBottom: 4 }}>
                    {item.category_name || '未分类'}
                    {item.brand && <span> · {item.brand}</span>}
                    {item.quantity > 1 && <span> · {item.quantity}{item.unit}</span>}
                  </div>
                  {item.tags?.length > 0 && (
                    <div className="tag-list">
                      {item.tags.slice(0, 3).map((t, i) => <span key={i} className="tag-item">{t}</span>)}
                    </div>
                  )}
                  {item.expiry_date && (
                    <div style={{ fontSize: 11, marginTop: 4, fontWeight: 500,
                      color: isExpired(item.expiry_date) ? '#EF4444' : '#F59E0B' }}>
                      {isExpired(item.expiry_date) ? '已过期' : `${item.expiry_date}`}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <Tag color={statusMap[item.status]?.color || 'default'} fill="outline"
                    style={{ fontSize: 11, borderRadius: 12, flexShrink: 0 }}>
                    {statusMap[item.status]?.text || item.status}
                  </Tag>
                  {item.quantity <= 1 && item.status === 'in_use' && item.unit !== '个' && (
                    <span style={{ fontSize: 10, color: '#EA580C', background: '#FFF7ED', padding: '2px 6px', borderRadius: 4 }}>需补货</span>
                  )}
                </div>
              </div>
            </div>
          </SwipeAction>
        ))
      )}

      <FloatingBubble
        style={{ '--initial-position-bottom': '80px', '--initial-position-right': '16px', '--edge-distance': '16px' }}
        onClick={() => navigate(addPath)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>
    </div>
  );
}
