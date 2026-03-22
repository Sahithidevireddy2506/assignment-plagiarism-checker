const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const Submission = require('../Models/Submission');
const Assignment = require('../Models/Assignment');
const auth = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed'));
  }
});

function getSimilarity(text1, text2) {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  const intersection = [...set1].filter(w => set2.has(w));
  const union = new Set([...set1, ...set2]);
  return Math.round((intersection.length / union.size) * 100);
}

function generateFeedback(score, text) {
  const words = text.split(/\s+/).length;
  if (score > 70) return 'High similarity detected. Please review for plagiarism.';
  if (score > 40) return 'Moderate similarity. Consider rewriting in your own words.';
  if (words < 100) return 'Submission too short. Add more content.';
  return 'Good submission! Content appears original.';
}

router.post('/submit', auth, upload.single('file'), async (req, res) => {
  try {
    const { assignmentId } = req.body;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment)
      return res.status(404).json({ message: 'Assignment not found' });
    const existing = await Submission.findOne({
      assignment: assignmentId, student: req.user.id
    });
    if (existing)
      return res.status(400).json({ message: 'Already submitted' });
    const pdfData = await pdfParse(req.file.buffer);
    const fileText = pdfData.text;
    const status = new Date() > assignment.deadline ? 'late' : 'on-time';
    const others = await Submission.find({
      assignment: assignmentId, student: { $ne: req.user.id }
    });
    let maxSimilarity = 0;
    for (let sub of others) {
      if (sub.fileText) {
        const score = getSimilarity(fileText, sub.fileText);
        if (score > maxSimilarity) maxSimilarity = score;
      }
    }
    const aiFeedback = generateFeedback(maxSimilarity, fileText);
    const submission = new Submission({
      assignment: assignmentId,
      student: req.user.id,
      fileName: req.file.originalname,
      fileText, status,
      similarityScore: maxSimilarity,
      aiFeedback
    });
    await submission.save();
    res.json({
      message: 'Submitted!',
      status,
      similarityScore: maxSimilarity,
      aiFeedback
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/all/:assignmentId', auth, async (req, res) => {
  try {
    const submissions = await Submission.find({
      assignment: req.params.assignmentId
    }).populate('student', 'name email');
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/mystudent', auth, async (req, res) => {
  try {
    const submissions = await Submission.find({ student: req.user.id });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;