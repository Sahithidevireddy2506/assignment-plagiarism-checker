const express = require('express');
const router = express.Router();
const Assignment = require('../Models/Assignment');
const auth = require('../middleware/auth');

router.post('/create', auth, async (req, res) => {
  try {
    const { title, description, subject, deadline } = req.body;
    if (!title || !description || !subject || !deadline)
      return res.status(400).json({ message: 'All fields required' });
    const assignment = new Assignment({
      title, description, subject, deadline,
      createdBy: req.user.id
    });
    await assignment.save();
    res.json({ message: 'Assignment created!', assignment });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/all', auth, async (req, res) => {
  try {
    const assignments = await Assignment.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;