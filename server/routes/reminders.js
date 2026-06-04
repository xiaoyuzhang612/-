const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// List reminders for user
router.get('/', (req, res) => {
  try {
    const db = global.db;
    const { family_id } = req.query;
    const reminders = db.prepare(`
      SELECT * FROM reminders
      WHERE is_dismissed = 0 AND (user_id = ? OR (user_id IS NULL AND family_id = ?))
      ORDER BY created_at DESC
    `).all(req.user.id, family_id || null);
    res.json({ code: 0, data: reminders });
  } catch (e) { res.status(500).json({ code: 500, message: e.message }); }
});

// Dismiss a reminder
router.put('/:id/dismiss', (req, res) => {
  try {
    const db = global.db;
    db.prepare('UPDATE reminders SET is_dismissed = 1 WHERE id = ?').run(req.params.id);
    res.json({ code: 0, message: '已关闭' });
  } catch (e) { res.status(500).json({ code: 500, message: e.message }); }
});

module.exports = router;
