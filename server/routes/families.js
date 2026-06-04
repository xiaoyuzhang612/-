const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', (req, res) => {
  try {
    const db = global.db;
    const rows = db.prepare(`
      SELECT f.*, fm.role, u.nickname as owner_name
      FROM family_members fm
      JOIN families f ON fm.family_id = f.id
      JOIN users u ON f.owner_id = u.id
      WHERE fm.user_id = ?
      ORDER BY fm.joined_at DESC
    `).all(req.user.id);
    res.json({ code: 0, data: rows });
  } catch (e) { res.status(500).json({ code: 500, message: e.message }); }
});

router.get('/:id', (req, res) => {
  try {
    const db = global.db;
    const family = db.prepare('SELECT * FROM families WHERE id = ?').get(req.params.id);
    if (!family) return res.status(404).json({ code: 404, message: '家庭不存在' });

    const members = db.prepare(`
      SELECT u.id, u.username, u.nickname, u.avatar, u.age, u.gender, u.health_info,
             fm.role, fm.tag, fm.joined_at
      FROM family_members fm JOIN users u ON fm.user_id = u.id
      WHERE fm.family_id = ?
    `).all(req.params.id);

    // Get item quantity per member
    const itemOwnerStmt = db.prepare(`
      SELECT COALESCE(SUM(i.quantity), 0) as cnt FROM item_owners io
      JOIN items i ON io.item_id = i.id WHERE io.user_id = ? AND i.family_id = ?
    `);
    members.forEach(m => {
      m.item_count = itemOwnerStmt.get(m.id, req.params.id)?.cnt || 0;
    });

    const physicalBoxCount = db.prepare('SELECT COUNT(*) as cnt FROM boxes WHERE family_id = ?').get(req.params.id).cnt;
    const customModuleCount = db.prepare(`
      SELECT COUNT(DISTINCT cm.id) as cnt FROM custom_modules cm
      JOIN family_members fm ON cm.created_by = fm.user_id WHERE fm.family_id = ?
    `).get(req.params.id).cnt;
    const stats = {
      box_count: physicalBoxCount + customModuleCount,
      item_type_count: db.prepare('SELECT COUNT(*) as cnt FROM items WHERE family_id = ?').get(req.params.id).cnt,
      item_total_count: db.prepare('SELECT COALESCE(SUM(quantity), 0) as cnt FROM items WHERE family_id = ?').get(req.params.id).cnt,
      member_count: members.length
    };

    res.json({ code: 0, data: { ...family, members, stats } });
  } catch (e) { res.status(500).json({ code: 500, message: e.message }); }
});

router.post('/', (req, res) => {
  try {
    const db = global.db;
    const { name, address, description } = req.body;
    if (!name) return res.status(400).json({ code: 400, message: '家庭名称不能为空' });

    const result = db.prepare('INSERT INTO families (name, owner_id, address, description) VALUES (?, ?, ?, ?)')
      .run(name, req.user.id, address || null, description || null);

    db.prepare('INSERT INTO family_members (family_id, user_id, role) VALUES (?, ?, ?)')
      .run(result.lastInsertRowid, req.user.id, 'owner');

    const family = db.prepare('SELECT * FROM families WHERE id = ?').get(result.lastInsertRowid);
    res.json({ code: 0, data: family, message: '创建成功' });
  } catch (e) { res.status(500).json({ code: 500, message: e.message }); }
});

router.put('/:id', (req, res) => {
  try {
    const db = global.db;
    const { name, address, description } = req.body;
    db.prepare('UPDATE families SET name=?, address=?, description=? WHERE id=?')
      .run(name, address, description, req.params.id);
    const family = db.prepare('SELECT * FROM families WHERE id = ?').get(req.params.id);
    res.json({ code: 0, data: family, message: '更新成功' });
  } catch (e) { res.status(500).json({ code: 500, message: e.message }); }
});

router.delete('/:id', (req, res) => {
  try {
    const db = global.db;
    db.prepare('DELETE FROM family_members WHERE family_id = ?').run(req.params.id);
    db.prepare('DELETE FROM families WHERE id = ?').run(req.params.id);
    res.json({ code: 0, message: '删除成功' });
  } catch (e) { res.status(500).json({ code: 500, message: e.message }); }
});

router.post('/:id/members', (req, res) => {
  try {
    const db = global.db;
    const { username, role } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return res.status(404).json({ code: 404, message: '用户不存在' });

    const existing = db.prepare('SELECT * FROM family_members WHERE family_id = ? AND user_id = ?')
      .get(req.params.id, user.id);
    if (existing) return res.status(400).json({ code: 400, message: '用户已在家庭中' });

    db.prepare('INSERT INTO family_members (family_id, user_id, role) VALUES (?, ?, ?)')
      .run(req.params.id, user.id, role || 'member');
    res.json({ code: 0, message: '添加成功' });
  } catch (e) { res.status(500).json({ code: 500, message: e.message }); }
});

router.put('/:id/members/:userId', (req, res) => {
  try {
    const db = global.db;
    const { role, tag } = req.body;
    db.prepare('UPDATE family_members SET role = ?, tag = ? WHERE family_id = ? AND user_id = ?')
      .run(role, tag || null, req.params.id, req.params.userId);
    res.json({ code: 0, message: '更新成功' });
  } catch (e) { res.status(500).json({ code: 500, message: e.message }); }
});

router.delete('/:id/members/:userId', (req, res) => {
  try {
    const db = global.db;
    db.prepare('DELETE FROM family_members WHERE family_id = ? AND user_id = ?')
      .run(req.params.id, req.params.userId);
    res.json({ code: 0, message: '移除成功' });
  } catch (e) { res.status(500).json({ code: 500, message: e.message }); }
});

module.exports = router;
