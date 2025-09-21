import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../types';

/**
 * User schema for MongoDB
 */
const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
  },
  usage_count: {
    type: Number,
    default: 0,
    min: 0,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  last_active: {
    type: Date,
    default: Date.now,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  preferences: {
    region: {
      type: String,
      default: 'US',
      enum: ['US', 'UK', 'CA', 'AU', 'IN', 'SG', 'DE', 'FR', 'ES', 'IT', 'JP', 'KR', 'BR', 'MX'],
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'hi'],
    },
  },
}, {
  timestamps: true,
  versionKey: false,
});

// Indexes for better performance
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ created_at: -1 });
UserSchema.index({ last_active: -1 });
UserSchema.index({ is_active: 1 });

// Virtual for user ID
UserSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
UserSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// Pre-save middleware to update last_active
UserSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.last_active = new Date();
  }
  next();
});

// Instance methods
UserSchema.methods.incrementUsage = function() {
  this.usage_count += 1;
  this.last_active = new Date();
  return this.save();
};

UserSchema.methods.updateLastActive = function() {
  this.last_active = new Date();
  return this.save();
};

UserSchema.methods.deactivate = function() {
  this.is_active = false;
  return this.save();
};

UserSchema.methods.activate = function() {
  this.is_active = true;
  return this.save();
};

// Static methods
UserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

UserSchema.statics.findActiveUsers = function() {
  return this.find({ is_active: true });
};

UserSchema.statics.getUsageStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: { $sum: { $cond: ['$is_active', 1, 0] } },
        totalUsage: { $sum: '$usage_count' },
        averageUsage: { $avg: '$usage_count' },
      },
    },
  ]);
};

UserSchema.statics.getTopUsers = function(limit: number = 10) {
  return this.find({ is_active: true })
    .sort({ usage_count: -1 })
    .limit(limit)
    .select('email usage_count last_active');
};

UserSchema.statics.getUsersByRegion = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$preferences.region',
        count: { $sum: 1 },
        totalUsage: { $sum: '$usage_count' },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

// Create and export the model
const User = mongoose.model<IUser & Document>('User', UserSchema);

export default User;
