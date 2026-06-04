const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// List categories (optionally filter by storage_type)
router.get('/', (req, res) => {
  try {
    const db = global.db;
    const { storage_type } = req.query;
    let sql = 'SELECT * FROM categories';
    const params = [];
    if (storage_type) { sql += ' WHERE storage_type = ?'; params.push(storage_type); }
    sql += ' ORDER BY is_default DESC, id ASC';
    const rows = db.prepare(sql).all(...params);
    res.json({ code: 0, data: rows });
  } catch (e) { res.status(500).json({ code: 500, message: e.message }); }
});

// Create category (only for custom type)
router.post('/', (req, res) => {
  try {
    const db = global.db;
    const { name, description, icon, color } = req.body;
    if (!name) return res.status(400).json({ code: 400, message: '分类名称不能为空' });
    const result = db.prepare(
      'INSERT INTO categories (name, storage_type, description, icon, color, is_default) VALUES (?, ?, ?, ?, ?, 0)'
    ).run(name, 'custom', description || null, icon || '📦', color || '#1677ff');
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.json({ code: 0, data: cat, message: '创建成功' });
  } catch (e) { res.status(500).json({ code: 500, message: e.message }); }
});

// Update category
router.put('/:id', (req, res) => {
  try {
    const db = global.db;
    const { name, description, icon, color } = req.body;
    db.prepare('UPDATE categories SET name=?, description=?, icon=?, color=? WHERE id=?')
      .run(name, description, icon, color, req.params.id);
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    res.json({ code: 0, data: cat, message: '更新成功' });
  } catch (e) { res.status(500).json({ code: 500, message: e.message }); }
});

// Delete category (only non-default)
router.delete('/:id', (req, res) => {
  try {
    const db = global.db;
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!cat) return res.status(404).json({ code: 404, message: '分类不存在' });
    if (cat.is_default) return res.status(400).json({ code: 400, message: '默认分类不可删除' });
    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    res.json({ code: 0, message: '删除成功' });
  } catch (e) { res.status(500).json({ code: 500, message: e.message }); }
});

module.exports = router;
