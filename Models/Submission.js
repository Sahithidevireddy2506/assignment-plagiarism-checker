const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileName: { type: String, required: true },
  fileText: { type: String, default: '' },
  status: { type: String, enum: ['on-time', 'late'], default: 'on-time' },
  similarityScore: { type: Number, default: 0 },
  aiFeedback: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Submission', SubmissionSchema);