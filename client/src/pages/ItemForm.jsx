import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Picker, Toast, DatePicker, TextArea } from 'antd-mobile'
import { items as itemsApi, categories, modules as modulesApi, families } from '../api'

const unitOptions = ['个', '件', '盒', '瓶', '包', '袋', '支', '板', '罐', '条', '卷', '套'];
const statusOptions = [
  { label: '使用中', value: 'in_use' }, { label: '已丢弃', value: 'discarded' },
  { label: '已捐赠', value: 'donated' }, { label: '已借出', value: 'lent' },
  { label: '已过期', value: 'expired' }, { label: '已损坏', value: 'damaged' },
];
const typeColors = { medicine: '#EF4444', daily: '#10B981' };
const typeIcons = { medicine: '💊', daily: '🧴' };

function FormRow({ label, value, placeholder, onClick, right, danger }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0', borderBottom: '1px solid #F3F4F6', cursor: onClick ? 'pointer' : 'default'
    }}>
      <span style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500, flexShrink: 0, width: 80 }}>{label}</span>
      <div style={{ flex: 1, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
        {right || (
          <span style={{ fontSize: 15, color: value ? 'var(--text-primary)' : 'var(--text-hint)' }}>
            {value || placeholder || '请选择'}
          </span>
        )}
        {onClick && <span style={{ color: 'var(--text-hint)', fontSize: 12 }}>›</span>}
      </div>
    </div>
  );
}

export default function ItemForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const defaultType = searchParams.get('type') || null;
  const moduleId = searchParams.get('module');

  const [cats, setCats] = useState([]);
  const [catPicker, setCatPicker] = useState(false);
  const [statusPicker, setStatusPicker] = useState(false);
  const [unitPicker, setUnitPicker] = useState(false);
  const [prodDatePicker, setProdDatePicker] = useState(false);
  const [purchaseDatePicker, setPurchaseDatePicker] = useState(false);
  const [expiryDatePicker, setExpiryDatePicker] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [customModule, setCustomModule] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [form, setForm] = useState({
    name: '', category_id: '', storage_type: defaultType, quantity: 1, unit: '个',
    production_date: null, purchase_date: null, expiry_date: null,
    warranty_date: null, status: 'in_use', brand: '', model: '', notes: '', tags: [],
    module_id: moduleId || null, owners: []
  });

  useEffect(() => {
    categories.list({ storage_type: form.storage_type }).then(res => {
      setCats(res.data.map(c => ({ label: `${c.icon || ''} ${c.name}`, value: String(c.id) })));
    });
    families.list().then(res => {
      if (res.data?.length > 0) {
        families.get(res.data[0].id).then(r => setFamilyMembers(r.data.members || [])).catch(() => {});
      }
    }).catch(() => {});
    if (moduleId) {
      modulesApi.get(moduleId).then(res => setCustomModule(res.data)).catch(() => {});
    }
    if (isEdit) {
      itemsApi.get(id).then(res => {
        const i = res.data;
        setForm({
          name: i.name || '', category_id: i.category_id ? String(i.category_id) : '',
          storage_type: i.storage_type || null, quantity: i.quantity || 1, unit: i.unit || '个',
          production_date: i.production_date ? new Date(i.production_date) : null,
          purchase_date: i.purchase_date ? new Date(i.purchase_date) : null,
          expiry_date: i.expiry_date ? new Date(i.expiry_date) : null,
          warranty_date: i.warranty_date ? new Date(i.warranty_date) : null,
          status: i.status || 'in_use', brand: i.brand || '', model: i.model || '',
          notes: i.notes || '', tags: i.tags || [], module_id: i.module_id || moduleId || null,
          owners: (i.owners || []).map(o => o.id)
        });
      });
    }
  }, [id, form.storage_type]);

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) { setForm(f => ({ ...f, tags: [...f.tags, tag] })); setTagInput(''); }
  };
  const removeTag = (tag) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));
  const toggleOwner = (userId) => setForm(f => ({
    ...f, owners: f.owners.includes(userId) ? f.owners.filter(id => id !== userId) : [...f.owners, userId]
  }));
  const formatDate = (d) => d ? (d instanceof Date ? d : new Date(d)).toISOString().split('T')[0] : null;
  const displayDate = (d) => d ? formatDate(d) : null;

  const handleSubmit = async () => {
    if (!form.name.trim()) return Toast.show({ content: '请输入物品名称' });
    const payload = { ...form, category_id: form.category_id || null,
      module_id: form.module_id || moduleId || null,
      production_date: formatDate(form.production_date), purchase_date: formatDate(form.purchase_date),
      expiry_date: formatDate(form.expiry_date), warranty_date: formatDate(form.warranty_date) };
    if (isEdit) { await itemsApi.update(id, payload); Toast.show({ icon: 'success', content: '更新成功' }); }
    else { await itemsApi.create(payload); Toast.show({ icon: 'success', content: '创建成功' }); }
    navigate(-1);
  };

  const color = customModule?.color || typeColors[form.storage_type] || '#4F6EF7';
  const icon = customModule?.icon || typeIcons[form.storage_type] || '📦';

  return (
    <div>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
        borderRadius: '0 0 24px 24px', margin: '-16px -16px 20px', padding: '20px 16px 28px',
        color: '#fff', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -20, right: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <span style={{ cursor: 'pointer', marginRight: 12, fontSize: 18 }} onClick={() => navigate(-1)}>←</span>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{isEdit ? '编辑物品' : '添加物品'}</h2>
            <div style={{ marginTop: 4, opacity: 0.8, fontSize: 13 }}>{icon} {customModule ? customModule.name : (isEdit ? '修改物品信息' : '记录新的物品')}</div>
          </div>
        </div>
      </div>

      {/* Basic Info Card */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '4px 16px', boxShadow: 'var(--shadow-sm)', marginBottom: 12 }}>
        <div style={{ padding: '14px 0', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ fontSize: 12, color: 'var(--text-hint)', marginBottom: 6, fontWeight: 500 }}>物品名称 *</div>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="输入物品名称"
            style={{ border: 'none', outline: 'none', fontSize: 16, fontWeight: 600, width: '100%', color: 'var(--text-primary)', background: 'transparent' }} />
        </div>
        <FormRow label="分类" value={cats.find(c => c.value === form.category_id)?.label} onClick={() => setCatPicker(true)} />
        <FormRow label="数量" right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
              style={{ width: 48, border: 'none', outline: 'none', fontSize: 15, textAlign: 'center', background: '#F4F6FA', borderRadius: 6, padding: '4px 0', color: 'var(--text-primary)', fontWeight: 600 }} />
            <span onClick={() => setUnitPicker(true)} style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>{form.unit} ▾</span>
          </div>
        } />
      </div>

      {/* Detail Info Card */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '4px 16px', boxShadow: 'var(--shadow-sm)', marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--text-hint)', padding: '12px 0 4px', fontWeight: 600, letterSpacing: '0.5px' }}>详细信息</div>
        <FormRow label="品牌" right={
          <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
            placeholder="选填" style={{ border: 'none', outline: 'none', fontSize: 15, textAlign: 'right', color: 'var(--text-primary)', background: 'transparent', width: '100%' }} />
        } />
        <FormRow label="型号" right={
          <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
            placeholder="选填" style={{ border: 'none', outline: 'none', fontSize: 15, textAlign: 'right', color: 'var(--text-primary)', background: 'transparent', width: '100%' }} />
        } />
        <FormRow label="状态" value={statusOptions.find(s => s.value === form.status)?.label} onClick={() => setStatusPicker(true)} />
      </div>

      {/* Date Card */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '4px 16px', boxShadow: 'var(--shadow-sm)', marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--text-hint)', padding: '12px 0 4px', fontWeight: 600, letterSpacing: '0.5px' }}>日期信息</div>
        {(form.storage_type === 'medicine' || form.storage_type === 'daily') && (
          <>
            <FormRow label="生产日期" value={displayDate(form.production_date)} onClick={() => setProdDatePicker(true)} />
            <FormRow label={form.storage_type === 'medicine' ? '有效期至' : '保质期至'} value={displayDate(form.expiry_date)}
              onClick={() => setExpiryDatePicker(true)}
              danger={form.expiry_date && new Date(form.expiry_date) < new Date()} />
          </>
        )}
        {customModule && (
          <>
            <FormRow label="购买日期" value={displayDate(form.purchase_date)} onClick={() => setPurchaseDatePicker(true)} />
            <FormRow label="保质/保修期" value={displayDate(form.expiry_date)} onClick={() => setExpiryDatePicker(true)} />
          </>
        )}
      </div>

      {/* Tags Card */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '4px 16px 12px', boxShadow: 'var(--shadow-sm)', marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--text-hint)', padding: '12px 0 8px', fontWeight: 600, letterSpacing: '0.5px' }}>标签</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag()}
            placeholder="输入标签，回车添加"
            style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', color: 'var(--text-primary)', background: 'transparent' }} />
          <button onClick={addTag} style={{
            background: `${color}15`, color: color, border: 'none', borderRadius: 8,
            padding: '0 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
          }}>添加</button>
        </div>
        {form.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {form.tags.map((t, i) => (
              <span key={i} onClick={() => removeTag(t)} style={{
                background: `${color}12`, color: color, padding: '5px 12px', borderRadius: 20,
                fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
              }}>{t} <span style={{ fontSize: 11, opacity: 0.6 }}>x</span></span>
            ))}
          </div>
        )}
      </div>

      {/* Owners Card */}
      {familyMembers.length > 0 && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '4px 16px 12px', boxShadow: 'var(--shadow-sm)', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-hint)', padding: '12px 0 8px', fontWeight: 600, letterSpacing: '0.5px' }}>归属人</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {familyMembers.map(m => {
              const selected = form.owners.includes(m.id);
              return (
                <div key={m.id} onClick={() => toggleOwner(m.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 20,
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: selected ? `${color}15` : '#F4F6FA',
                  border: selected ? `1.5px solid ${color}` : '1.5px solid transparent',
                  color: selected ? color : 'var(--text-secondary)'
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', fontSize: 10, fontWeight: 700,
                    background: selected ? color : '#D1D5DB', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>{(m.nickname || m.username || '?')[0]}</div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{m.tag || m.nickname || m.username}</span>
                  {selected && <span style={{ fontSize: 11 }}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes Card */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '4px 16px 12px', boxShadow: 'var(--shadow-sm)', marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--text-hint)', padding: '12px 0 4px', fontWeight: 600, letterSpacing: '0.5px' }}>备注</div>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="添加备注信息..."
          rows={3} style={{
            width: '100%', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary)',
            background: '#F4F6FA', borderRadius: 8, padding: '10px 12px', resize: 'none', lineHeight: 1.6
          }} />
      </div>

      {/* Submit Button */}
      <div style={{ padding: '0 0 24px' }}>
        <button onClick={handleSubmit} style={{
          width: '100%', height: 50, borderRadius: 14, border: 'none',
          background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
          color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
          boxShadow: `0 4px 14px ${color}40`, letterSpacing: '0.5px'
        }}>
          {isEdit ? '保存修改' : '添加物品'}
        </button>
      </div>

      {/* Pickers */}
      <Picker columns={[cats]} visible={catPicker} onClose={() => setCatPicker(false)}
        onConfirm={v => setForm(f => ({ ...f, category_id: v[0] }))} />
      <Picker columns={[statusOptions]} visible={statusPicker} onClose={() => setStatusPicker(false)}
        onConfirm={v => setForm(f => ({ ...f, status: v[0] }))} />
      <Picker columns={[unitOptions.map(u => ({ label: u, value: u }))]}
        visible={unitPicker} onClose={() => setUnitPicker(false)}
        onConfirm={v => setForm(f => ({ ...f, unit: v[0] }))} />
      <DatePicker visible={prodDatePicker} onClose={() => setProdDatePicker(false)}
        onConfirm={v => setForm(f => ({ ...f, production_date: v }))} />
      <DatePicker visible={purchaseDatePicker} onClose={() => setPurchaseDatePicker(false)}
        onConfirm={v => setForm(f => ({ ...f, purchase_date: v }))} />
      <DatePicker visible={expiryDatePicker} onClose={() => setExpiryDatePicker(false)}
        onConfirm={v => setForm(f => ({ ...f, expiry_date: v }))} />
    </div>
  );
}
