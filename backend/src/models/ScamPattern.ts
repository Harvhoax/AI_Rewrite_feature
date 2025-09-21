import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';
import { IScamPattern } from '../types';

/**
 * ScamPattern schema for MongoDB
 */
const ScamPatternSchema = new Schema<IScamPattern>({
  pattern_hash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  category: {
    type: String,
    required: true,
    enum: [
      'phishing',
      'urgent_payment',
      'fake_links',
      'personal_info',
      'suspicious_attachments',
      'fake_authority',
      'too_good_to_be_true',
      'pressure_tactics',
      'grammar_errors',
      'suspicious_sender',
      'other',
    ],
  },
  frequency: {
    type: Number,
    required: true,
    default: 1,
    min: 1,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  last_seen: {
    type: Date,
    default: Date.now,
  },
  examples: [{
    type: String,
    required: true,
    maxlength: 1000,
  }],
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  is_active: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  versionKey: false,
});

// Indexes for better performance
ScamPatternSchema.index({ pattern_hash: 1 }, { unique: true });
ScamPatternSchema.index({ category: 1 });
ScamPatternSchema.index({ frequency: -1 });
ScamPatternSchema.index({ created_at: -1 });
ScamPatternSchema.index({ last_seen: -1 });
ScamPatternSchema.index({ is_active: 1 });
ScamPatternSchema.index({ severity: 1 });

// Compound indexes
ScamPatternSchema.index({ category: 1, frequency: -1 });
ScamPatternSchema.index({ is_active: 1, frequency: -1 });
ScamPatternSchema.index({ severity: 1, frequency: -1 });

// Virtual for pattern ID
ScamPatternSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
ScamPatternSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// Pre-save middleware to generate pattern hash
ScamPatternSchema.pre('save', function(next) {
  if (this.isNew && !this.pattern_hash) {
    // Generate hash from examples and category
    const hashInput = this.examples.join('|') + this.category;
    this.pattern_hash = crypto.createHash('sha256').update(hashInput).digest('hex');
  }
  next();
});

// Instance methods
ScamPatternSchema.methods.incrementFrequency = function() {
  this.frequency += 1;
  this.last_seen = new Date();
  return this.save();
};

ScamPatternSchema.methods.addExample = function(example: string) {
  if (!this.examples.includes(example) && this.examples.length < 10) {
    this.examples.push(example);
    this.last_seen = new Date();
  }
  return this.save();
};

ScamPatternSchema.methods.updateSeverity = function(severity: 'low' | 'medium' | 'high' | 'critical') {
  this.severity = severity;
  return this.save();
};

ScamPatternSchema.methods.deactivate = function() {
  this.is_active = false;
  return this.save();
};

ScamPatternSchema.methods.activate = function() {
  this.is_active = true;
  return this.save();
};

// Static methods
ScamPatternSchema.statics.findByHash = function(patternHash: string) {
  return this.findOne({ pattern_hash: patternHash });
};

ScamPatternSchema.statics.findByCategory = function(category: string) {
  return this.find({ category, is_active: true }).sort({ frequency: -1 });
};

ScamPatternSchema.statics.findTrending = function(limit: number = 10) {
  return this.find({ is_active: true })
    .sort({ frequency: -1, last_seen: -1 })
    .limit(limit);
};

ScamPatternSchema.statics.findBySeverity = function(severity: string) {
  return this.find({ severity, is_active: true }).sort({ frequency: -1 });
};

ScamPatternSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalPatterns: { $sum: 1 },
        activePatterns: { $sum: { $cond: ['$is_active', 1, 0] } },
        totalFrequency: { $sum: '$frequency' },
        averageFrequency: { $avg: '$frequency' },
      },
    },
  ]);
};

ScamPatternSchema.statics.getStatsByCategory = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalFrequency: { $sum: '$frequency' },
        averageFrequency: { $avg: '$frequency' },
        activeCount: { $sum: { $cond: ['$is_active', 1, 0] } },
      },
    },
    { $sort: { totalFrequency: -1 } },
  ]);
};

ScamPatternSchema.statics.getStatsBySeverity = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$severity',
        count: { $sum: 1 },
        totalFrequency: { $sum: '$frequency' },
        averageFrequency: { $avg: '$frequency' },
      },
    },
    { $sort: { totalFrequency: -1 } },
  ]);
};

ScamPatternSchema.statics.findSimilarPatterns = function(message: string, threshold: number = 0.8) {
  // This is a simplified similarity search
  // In production, you might want to use more sophisticated algorithms
  const words = message.toLowerCase().split(/\s+/);
  
  return this.find({
    is_active: true,
    $or: words.map(word => ({
      examples: { $regex: word, $options: 'i' }
    }))
  }).sort({ frequency: -1 });
};

ScamPatternSchema.statics.cleanupInactivePatterns = function(daysInactive: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysInactive);
  
  return this.updateMany(
    { 
      last_seen: { $lt: cutoffDate },
      frequency: { $lt: 5 }
    },
    { is_active: false }
  );
};

ScamPatternSchema.statics.generatePatternHash = function(text: string): string {
  return crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex');
};

ScamPatternSchema.statics.findOrCreatePattern = async function(
  message: string,
  category: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) {
  const patternHash = this.generatePatternHash(message);
  let pattern = await this.findByHash(patternHash);
  
  if (pattern) {
    await pattern.incrementFrequency();
    return pattern;
  }
  
  // Create new pattern
  pattern = new this({
    pattern_hash: patternHash,
    category,
    severity,
    examples: [message],
    frequency: 1,
  });
  
  return pattern.save();
};

// Create and export the model
const ScamPattern = mongoose.model<IScamPattern & Document>('ScamPattern', ScamPatternSchema);

export default ScamPattern;
