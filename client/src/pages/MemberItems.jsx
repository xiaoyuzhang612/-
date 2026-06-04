import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SwipeAction, Dialog, Toast } from 'antd-mobile'
import { items as itemsApi, families, categories as catsApi, boxes as boxesApi } from '../api'

const statusMap = {
  in_use: { text: '使用中', color: '#10B981' },
  discarded: { text: '已丢弃', color: '#F59E0B' },
  donated: { text: '已捐赠', color: '#8B5CF6' },
  lent: { text: '已借出', color: '#6B7280' },
  expired: { text: '已过期', color: '#EF4444' },
  damaged: { text: '已损坏', color: '#F97316' },
};

const builtinTabs = [
  { key: 'medicine', label: '药箱', icon: '💊' },
  { key: 'daily', label: '日化', icon: '🧴' },
];

export default function MemberItems() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [allItems, setAllItems] = useState([]);
  const [customBoxes, setCustomBoxes] = useState([]);
  const [activeType, setActiveType] = useState('all');
  const [activeCat, setActiveCat] = useState(null);
  const [catExpanded, setCatExpanded] = useState(false);
  const [familyId, setFamilyId] = useState(null);
  const [allCats, setAllCats] = useState([]);

  useEffect(() => {
    families.list().then(res => {
      if (res.data?.length > 0) {
        const fid = res.data[0].id;
        setFamilyId(fid);
        families.get(fid).then(r => {
          const m = r.data.members?.find(m => String(m.id) === String(userId));
          if (m) setMember(m);
        }).catch(() => {});
        itemsApi.list({ family_id: fid }).then(r => setAllItems(r.data || [])).catch(() => {});
      }
    }).catch(() => {});
    catsApi.list().then(res => setAllCats(res.data || [])).catch(() => {});
    boxesApi.list().then(res => setCustomBoxes(res.data?.filter(b => b.type === 'custom') || [])).catch(() => {});
  }, [userId]);

  const handleDelete = async (id) => {
    const result = await Dialog.confirm({ content: '确定删除这个物品吗？' });
    if (result) {
      await itemsApi.delete(id);
      Toast.show({ icon: 'success', content: '删除成功' });
      if (familyId) {
        itemsApi.list({ family_id: familyId }).then(r => setAllItems(r.data || [])).catch(() => {});
      }
    }
  };

  // Filter items by owner
  const memberItems = allItems.filter(item =>
    item.owners?.some(o => String(o.id) === String(userId))
  );

  // Build tabs based on actual member items
  const memberTypes = useMemo(() => {
    const tabs = [{ key: 'all', label: '全部', icon: '📋' }];
    const types = new Set(memberItems.map(item => item.storage_type).filter(Boolean));

    // Add builtin tabs if member has those types
    builtinTabs.forEach(t => { if (types.has(t.key)) tabs.push(t); });

    // Add custom module tabs with actual names
    const customModuleIds = new Set(memberItems.filter(i => i.storage_type === 'custom' && i.module_id).map(i => i.module_id));
    customBoxes.forEach(box => {
      if (customModuleIds.has(box.real_id)) {
        tabs.push({ key: `custom_${box.real_id}`, label: box.name, icon: box.icon || '📦' });
      }
    });

    // Add generic "custom" tab for items without module_id
    const hasOrphanCustom = memberItems.some(i => i.storage_type === 'custom' && !i.module_id);
    if (hasOrphanCustom) tabs.push({ key: 'custom', label: '其他', icon: '📦' });

    return tabs;
  }, [memberItems, customBoxes]);

  // Filter by storage type (or custom module)
  const typeFiltered = activeType === 'all'
    ? memberItems
    : activeType.startsWith('custom_')
      ? memberItems.filter(item => item.storage_type === 'custom' && String(item.module_id) === activeType.replace('custom_', ''))
      : activeType === 'custom'
        ? memberItems.filter(item => item.storage_type === 'custom' && !item.module_id)
        : memberItems.filter(item => item.storage_type === activeType);

  // Available categories for current type filter (from actual items)
  const availableCats = useMemo(() => {
    const catMap = new Map();
    typeFiltered.forEach(item => {
      if (item.category_id && item.category_name && !catMap.has(item.category_id)) {
        catMap.set(item.category_id, { id: item.category_id, name: item.category_name, icon: item.category_icon || '📦' });
      }
    });
    return Array.from(catMap.values());
  }, [typeFiltered]);

  // Filter by category
  const filteredItems = activeCat
    ? typeFiltered.filter(item => String(item.category_id) === String(activeCat))
    : typeFiltered;

  const totalQty = filteredItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const color = '#4F6EF7';

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
        color: '#fff', padding: '20px 16px 24px', borderRadius: '0 0 24px 24px',
        margin: '-16px -16px 16px', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -30, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <span style={{ cursor: 'pointer', marginRight: 12, fontSize: 18 }} onClick={() => navigate(-1)}>←</span>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, marginRight: 12, flexShrink: 0
          }}>
            {(member?.nickname || member?.username || '?')[0]}
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
              {member?.nickname || member?.username || '成员'}
              {member?.tag && <span style={{ fontSize: 13, opacity: 0.8, marginLeft: 8 }}>({member.tag})</span>}
            </h2>
            <p style={{ opacity: 0.7, fontSize: 13, margin: '2px 0 0' }}>
              {[member?.age && `${member.age}岁`, member?.gender].filter(Boolean).join(' · ')}
              {member?.health_info && ` · ${member.health_info}`}
            </p>
          </div>
        </div>
      </div>

      {/* Storage Type Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, overflowX: 'auto', paddingLeft: 2 }}>
        {memberTypes.map(tab => (
          <span key={tab.key} onClick={() => { setActiveType(tab.key); setActiveCat(null); }} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
            background: activeType === tab.key ? `${color}15` : 'var(--bg-card)',
            color: activeType === tab.key ? color : 'var(--text-secondary)',
            border: activeType === tab.key ? `1.5px solid ${color}` : '1.5px solid transparent',
          }}>
            {tab.icon} {tab.label}
          </span>
        ))}
      </div>

      {/* Category Sub-tabs */}
      {availableCats.length > 1 && (
        <div style={{ marginBottom: 14, paddingLeft: 2 }}>
          <div style={{
            display: 'flex', gap: 6, flexWrap: catExpanded ? 'wrap' : 'nowrap',
            overflowX: catExpanded ? 'visible' : 'auto',
          }}>
            <span onClick={() => setActiveCat(null)} style={{
              padding: '4px 10px', borderRadius: 14, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
              background: !activeCat ? `${color}12` : '#F4F6FA',
              color: !activeCat ? color : 'var(--text-hint)',
            }}>全部分类</span>
            {(catExpanded ? availableCats : availableCats.slice(0, 4)).map(cat => (
              <span key={cat.id} onClick={() => setActiveCat(activeCat === String(cat.id) ? null : String(cat.id))} style={{
                padding: '4px 10px', borderRadius: 14, fontSize: 12, fontWeight: 500,
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                background: activeCat === String(cat.id) ? `${color}12` : '#F4F6FA',
                color: activeCat === String(cat.id) ? color : 'var(--text-hint)',
              }}>
                {cat.icon} {cat.name}
              </span>
            ))}
            {!catExpanded && availableCats.length > 4 && (
              <span onClick={() => setCatExpanded(true)} style={{
                padding: '4px 10px', borderRadius: 14, fontSize: 12, fontWeight: 500,
                cursor: 'pointer', whiteSpace: 'nowrap',
                background: '#F4F6FA', color: 'var(--text-hint)',
              }}>
                +{availableCats.length - 4} ▾
              </span>
            )}
          </div>
          {catExpanded && availableCats.length > 4 && (
            <div onClick={() => setCatExpanded(false)} style={{
              textAlign: 'center', marginTop: 8, fontSize: 12, color: 'var(--text-hint)',
              cursor: 'pointer', fontWeight: 500,
            }}>
              收起 ▴
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 14,
        fontSize: 12, color: 'var(--text-secondary)'
      }}>
        <span>📋 {filteredItems.length} 种</span>
        <span>📦 {totalQty} 件</span>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>📭</div>
          <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>暂无物品</h3>
          <p style={{ color: 'var(--text-hint)', fontSize: 14 }}>
            {activeType === 'all' && !activeCat ? '该成员还没有归属物品' : '当前分类下没有物品'}
          </p>
        </div>
      ) : (
        filteredItems.map(item => (
          <SwipeAction key={item.id} rightActions={[
            { key: 'delete', text: '删除', color: 'danger', onClick: () => handleDelete(item.id) }
          ]}>
            <div className="list-item-card" onClick={() => navigate(`/items/${item.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                    {item.category_icon && <span style={{ marginRight: 4 }}>{item.category_icon}</span>}
                    {item.name}
                  </div>
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
    </div>
  );
}
