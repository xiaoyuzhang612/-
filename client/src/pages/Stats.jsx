import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Grid, Tag, List } from 'antd-mobile'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { stats } from '../api'

const COLORS = ['#ff4d4f', '#52c41a', '#1677ff', '#722ed1', '#ff8f1f', '#13c2c2', '#faad14', '#2f54eb'];
const typeLabels = { medicine: '药箱', daily: '日化', custom: '自定义' };
const typeColors = { medicine: '#ff4d4f', daily: '#52c41a', custom: '#1677ff' };

export default function Stats() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => { stats.get({}).then(res => setData(res.data)).catch(() => {}); }, []);

  if (!data) return null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ cursor: 'pointer', marginRight: 8 }} onClick={() => navigate('/')}>← 返回</span>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>数据统计</h2>
      </div>

      <Grid columns={2} gap={8} style={{ marginBottom: 16 }}>
        <Grid.Item>
          <div className="card" style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1677ff' }}>{data.itemCount}</div>
            <div style={{ fontSize: 12, color: '#999' }}>物品种类</div>
          </div>
        </Grid.Item>
        <Grid.Item>
          <div className="card" style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#ff8f1f' }}>{data.totalQuantity}</div>
            <div style={{ fontSize: 12, color: '#999' }}>物品总数</div>
          </div>
        </Grid.Item>
      </Grid>

      {data.storageTypeDistribution?.length > 0 && (
        <div className="card">
          <div className="section-title">存储模块分布</div>
          {data.storageTypeDistribution.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ width: 50, fontSize: 13 }}>{typeLabels[s.storage_type] || s.storage_type}</span>
              <div style={{ flex: 1, height: 10, background: '#f0f0f0', borderRadius: 5, marginLeft: 8 }}>
                <div style={{
                  height: '100%', borderRadius: 5,
                  width: `${Math.min(100, (s.count / (data.itemCount || 1)) * 100)}%`,
                  background: typeColors[s.storage_type] || '#1677ff'
                }} />
              </div>
              <span style={{ width: 30, textAlign: 'right', fontSize: 13, color: '#999' }}>{s.count}</span>
            </div>
          ))}
        </div>
      )}

      {data.categoryDistribution?.length > 0 && (
        <div className="card">
          <div className="section-title">物品分类分布</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 140, height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.categoryDistribution} dataKey="count" nameKey="name"
                    cx="50%" cy="50%" outerRadius={55} innerRadius={25}>
                    {data.categoryDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1 }}>
              {data.categoryDistribution.map((cat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                  <span style={{ fontSize: 12, flex: 1 }}>{cat.name}</span>
                  <span style={{ fontSize: 12, color: '#999' }}>{cat.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {data.statusDistribution?.length > 0 && (
        <div className="card">
          <div className="section-title">物品状态分布</div>
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.statusDistribution}>
                <XAxis dataKey="status" tick={{ fontSize: 11 }}
                  tickFormatter={v => ({ in_use: '使用中', discarded: '丢弃', donated: '捐赠', lent: '借出', expired: '过期', damaged: '损坏' }[v] || v)} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#1677ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {data.expiringSoon?.length > 0 && (
        <div className="card">
          <div className="section-title">即将过期物品</div>
          <List>
            {data.expiringSoon.map(item => (
              <List.Item key={item.id} description={item.category_name || '未分类'}
                extra={<Tag color="danger" fill="outline" style={{ fontSize: 11 }}>{item.expiry_date}</Tag>}
                onClick={() => navigate(`/items/${item.id}`)}>
                {item.name}
              </List.Item>
            ))}
          </List>
        </div>
      )}
    </div>
  );
}
