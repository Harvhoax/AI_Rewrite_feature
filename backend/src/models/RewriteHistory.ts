import mongoose, { Document, Schema } from 'mongoose';
import { IRewriteHistory } from '../types';

/**
 * RewriteHistory schema for MongoDB
 */
const RewriteHistorySchema = new Schema<IRewriteHistory>({
  user_id: {
    type: String,
    required: false,
    ref: 'User',
  },
  original_message: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true,
  },
  safe_version: {
    type: String,
    required: true,
    maxlength: 2000,
    trim: true,
  },
  region: {
    type: String,
    required: true,
    default: 'US',
    enum: ['US', 'UK', 'CA', 'AU', 'IN', 'SG', 'DE', 'FR', 'ES', 'IT', 'JP', 'KR', 'BR', 'MX'],
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  response_time: {
    type: Number,
    required: true,
    min: 0,
  },
  cached: {
    type: Boolean,
    default: false,
  },
  red_flags_fixed: {
    type: Number,
    required: true,
    min: 0,
    max: 10,
  },
  differences: [{
    aspect: {
      type: String,
      required: true,
      trim: true,
    },
    scam: {
      type: String,
      required: true,
      trim: true,
    },
    official: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      trim: true,
    },
  }],
}, {
  timestamps: true,
  versionKey: false,
});

// Indexes for better performance
RewriteHistorySchema.index({ user_id: 1, created_at: -1 });
RewriteHistorySchema.index({ created_at: -1 });
RewriteHistorySchema.index({ region: 1 });
RewriteHistorySchema.index({ cached: 1 });
RewriteHistorySchema.index({ red_flags_fixed: -1 });

// Compound indexes
RewriteHistorySchema.index({ user_id: 1, region: 1, created_at: -1 });
RewriteHistorySchema.index({ region: 1, created_at: -1 });

// Virtual for history ID
RewriteHistorySchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
RewriteHistorySchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// Pre-save middleware to validate data
RewriteHistorySchema.pre('save', function(next) {
  if (this.differences.length === 0) {
    return next(new Error('At least one difference must be provided'));
  }
  
  if (this.red_flags_fixed < 0 || this.red_flags_fixed > 10) {
    return next(new Error('Red flags fixed must be between 0 and 10'));
  }
  
  next();
});

// Instance methods
RewriteHistorySchema.methods.getFormattedDate = function() {
  return this.created_at.toISOString();
};

RewriteHistorySchema.methods.getResponseTimeFormatted = function() {
  return `${this.response_time}ms`;
};

// Static methods
RewriteHistorySchema.statics.findByUserId = function(userId: string, page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit;
  return this.find({ user_id: userId })
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit);
};

RewriteHistorySchema.statics.findByRegion = function(region: string, page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit;
  return this.find({ region })
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit);
};

RewriteHistorySchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalRewrites: { $sum: 1 },
        averageResponseTime: { $avg: '$response_time' },
        averageRedFlagsFixed: { $avg: '$red_flags_fixed' },
        cacheHitRate: { $avg: { $cond: ['$cached', 1, 0] } },
      },
    },
  ]);
};

RewriteHistorySchema.statics.getStatsByRegion = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$region',
        count: { $sum: 1 },
        averageResponseTime: { $avg: '$response_time' },
        averageRedFlagsFixed: { $avg: '$red_flags_fixed' },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

RewriteHistorySchema.statics.getStatsByDate = function(startDate: Date, endDate: Date) {
  return this.aggregate([
    {
      $match: {
        created_at: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$created_at' },
          month: { $month: '$created_at' },
          day: { $dayOfMonth: '$created_at' },
        },
        count: { $sum: 1 },
        averageResponseTime: { $avg: '$response_time' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
  ]);
};

RewriteHistorySchema.statics.getTopPatterns = function(limit: number = 10) {
  return this.aggregate([
    {
      $unwind: '$differences',
    },
    {
      $group: {
        _id: '$differences.aspect',
        count: { $sum: 1 },
        examples: { $addToSet: '$differences.scam' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);
};

RewriteHistorySchema.statics.getUserStats = function(userId: string) {
  return this.aggregate([
    { $match: { user_id: userId } },
    {
      $group: {
        _id: null,
        totalRewrites: { $sum: 1 },
        averageResponseTime: { $avg: '$response_time' },
        averageRedFlagsFixed: { $avg: '$red_flags_fixed' },
        firstRewrite: { $min: '$created_at' },
        lastRewrite: { $max: '$created_at' },
        regions: { $addToSet: '$region' },
      },
    },
  ]);
};

RewriteHistorySchema.statics.cleanupOldRecords = function(daysToKeep: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  return this.deleteMany({
    created_at: { $lt: cutoffDate },
  });
};

// Create and export the model
const RewriteHistory = mongoose.model<IRewriteHistory & Document>('RewriteHistory', RewriteHistorySchema);

export default RewriteHistory;
