import mongoose from 'mongoose';

const donationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  servings: {
    type: Number,
    required: true,
    min: 1
  },
  category: {
    type: String,
    enum: ['Cooked Food', 'Bakery', 'Fruits & Veg', 'Groceries'],
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'claimed', 'expired'],
    default: 'available'
  },
  expiryTime: {
    type: Date,
    required: true
  },
  donorName: {
    type: String,
    required: true
  },
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  donorPhone: {
    type: String,
    default: ''
  },
  pickupAddress: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    default: ''
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  
  // Delivery Logistics
  deliveryNeeded: {
    type: Boolean,
    default: false
  },
  deliveryStatus: {
    type: String,
    enum: ['none', 'pending_volunteer', 'in_transit', 'delivered'],
    default: 'none'
  },
  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  claimedByName: {
    type: String,
    default: ''
  },
  claimedAt: {
    type: Date,
    default: null
  },
  volunteerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  volunteerName: {
    type: String,
    default: ''
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual countdown utility helper
donationSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiryTime;
});

const Donation = mongoose.model('Donation', donationSchema);
export default Donation;
