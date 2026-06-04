import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tag, FloatingBubble, Empty, SwipeAction, Dialog, Toast } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { items as itemsApi } from '../api'

const statusMap = {
  in_use: { text: '使用中', color: 'primary' },
  discarded: { text: '已丢弃', color: 'warning' },
  donated: { text: '已捐赠', color: 'success' },
  lent: { text: '已借出', color: 'default' },
  expired: { text: '已过期', color: 'danger' },
  damaged: { text: '已损坏', color: 'warning' },
};

export default function Items() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);

  useEffect(() => {
    itemsApi.list({}).then(res => setList(res.data)).catch(() => {});
  }, []);

  const handleDelete = async (id) => {
    const result = await Dialog.confirm({ content: '确定删除这个物品吗？' });
    if (result) {
      await itemsApi.delete(id);
      Toast.show({ icon: 'success', content: '删除成功' });
      itemsApi.list({}).then(res => setList(res.data));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>所有物品</h2>
        <Tag color="primary" style={{ cursor: 'pointer' }} onClick={() => navigate('/items/new')}>+ 添加</Tag>
      </div>

      {list.length === 0 ? (
        <Empty description="还没有物品" style={{ padding: '40px 0' }} />
      ) : (
        list.map(item => (
          <SwipeAction key={item.id} rightActions={[
            { key: 'delete', text: '删除', color: 'danger', onClick: () => handleDelete(item.id) }
          ]}>
            <div className="card" onClick={() => navigate(`/items/${item.id}`)} style={{ cursor: 'pointer' }}>
              <div className="flex-between">
                <div>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                    {item.category_name || '未分类'}{item.brand && ` · ${item.brand}`}{item.quantity > 1 && ` x${item.quantity}`}
                  </div>
                </div>
                <Tag color={statusMap[item.status]?.color || 'default'} fill="outline" style={{ fontSize: 11 }}>
                  {statusMap[item.status]?.text || item.status}
                </Tag>
              </div>
            </div>
          </SwipeAction>
        ))
      )}

      <FloatingBubble style={{ '--initial-position-bottom': '80px', '--initial-position-right': '16px', '--edge-distance': '16px' }}
        onClick={() => navigate('/items/new')}>
        <AddOutline fontSize={24} />
      </FloatingBubble>
    </div>
  );
}
