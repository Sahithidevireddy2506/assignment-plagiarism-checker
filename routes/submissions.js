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
  const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;

  if (score > 70) {
    return {
      rating: 'Need to Improve',
      message: 'High similarity detected. Your submission appears to have significant overlap with existing submissions. Please rewrite in your own words.',
      emoji: 'needs_improvement'
    };
  }

  if (score > 50) {
    return {
      rating: 'Need to Improve',
      message: 'Moderate-to-high similarity found. Consider significantly rewriting your content to better reflect your own understanding.',
      emoji: 'needs_improvement'
    };
  }

  if (words < 50) {
    return {
      rating: 'Need to Improve',
      message: 'Submission is too short. Please provide a more detailed and complete response.',
      emoji: 'needs_improvement'
    };
  }

  if (score > 30) {
    return {
      rating: 'Good',
      message: 'Some similarity detected, but overall your submission appears mostly original. A few sections may benefit from rewording.',
      emoji: 'good'
    };
  }

  if (words < 150) {
    return {
      rating: 'Good',
      message: 'Content appears original! However, try to elaborate more for a more comprehensive submission.',
      emoji: 'good'
    };
  }

  if (words < 300) {
    return {
      rating: 'Excellent',
      message: 'Great work! Your submission is original and well-written. Adding a bit more detail would make it outstanding.',
      emoji: 'excellent'
    };
  }

  if (score <= 10 && words >= 300) {
    return {
      rating: 'Outstanding',
      message: 'Exceptional submission! Your work is highly original, detailed, and demonstrates strong understanding of the topic.',
      emoji: 'outstanding'
    };
  }

  return {
    rating: 'Excellent',
    message: 'Well done! Your submission is original and demonstrates good understanding. Keep up the great work!',
    emoji: 'excellent'
  };
}

router.post('/submit', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { assignmentId } = req.body;
    if (!assignmentId) {
      return res.status(400).json({ message: 'Assignment ID is required' });
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment)
      return res.status(404).json({ message: 'Assignment not found' });

    const existing = await Submission.findOne({
      assignment: assignmentId, student: req.user.id
    });
    if (existing)
      return res.status(400).json({ message: 'Already submitted' });

    let fileText = '';
    try {
      const pdfData = await pdfParse(req.file.buffer);
      fileText = pdfData.text || '';
    } catch (pdfErr) {
      console.error('PDF parse error:', pdfErr.message);
      fileText = '';
    }

    const status = new Date() > new Date(assignment.deadline) ? 'late' : 'on-time';

    const others = await Submission.find({
      assignment: assignmentId, student: { $ne: req.user.id }
    });

    let maxSimilarity = 0;
    if (fileText) {
      for (let sub of others) {
        if (sub.fileText) {
          const score = getSimilarity(fileText, sub.fileText);
          if (score > maxSimilarity) maxSimilarity = score;
        }
      }
    }

    const feedback = generateFeedback(maxSimilarity, fileText);
    const aiFeedback = `${feedback.rating}: ${feedback.message}`;

    const submission = new Submission({
      assignment: assignmentId,
      student: req.user.id,
      fileName: req.file.originalname,
      fileText,
      status,
      similarityScore: maxSimilarity,
      aiFeedback
    });
    await submission.save();

    res.json({
      message: 'Submitted successfully!',
      status,
      similarityScore: maxSimilarity,
      aiFeedback,
      rating: feedback.rating,
      feedbackMessage: feedback.message
    });
  } catch (err) {
    console.error('Submission error:', err);
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
