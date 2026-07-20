import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email:               { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:            { type: String, default: null },
  fullName:            { type: String, default: '' },
  role:                { type: String, enum: ['admin', 'customer', 'provider', 'customer_provider'], default: 'customer' },
  isActive:            { type: Boolean, default: true },
  oauth_provider:      { type: String, default: null },
  oauth_id:            { type: String, default: null },
  avatar:              { type: String, default: '' },
  onboarding_complete: { type: Boolean, default: true },
  phone:               { type: String, default: '' },
}, { timestamps: true });


const RequestSchema = new mongoose.Schema({
  user_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:         { type: String, required: true },
  amount:        { type: Number, required: true },
  category:      { type: String, default: '' },
  deadline:      { type: String, default: '' },
  description:   { type: String, default: '' },
  product_link:  { type: String, default: '' },
  is_public:     { type: Boolean, default: true },
  status:        { type: String, enum: ['pending', 'matched', 'completed', 'cancelled'], default: 'pending' },
  // Auto-discovered best card for this product (populated by crawler)
  best_card_info: {
    card_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
    card_name:       { type: String,  default: '' },
    bank:            { type: String,  default: '' },
    discount_amount: { type: Number,  default: 0 },   // Actual ₹ savings from card offer
    final_price:     { type: Number,  default: 0 },   // Price after card discount
  },
  product_image:  { type: String, default: '' },        // Product thumbnail from crawler
  raw_offers:     { type: [String], default: [] },      // All bank offer strings from product page
  merchant:       { type: String, default: '' },        // 'amazon' | 'flipkart' | 'myntra'
}, { timestamps: true });

const OfferSchema = new mongoose.Schema({
  user_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  card_name:   { type: String, required: true },
  bank:        { type: String, default: '' },
  max_amount:  { type: Number, default: 0 },
  discount:    { type: Number, default: 0 },
  cashback:    { type: Number, default: 0 },
  categories:  { type: [String], default: [] },
  holder_name: { type: String, default: '' },
  rating:      { type: Number, default: 5 },
  deals_done:  { type: Number, default: 0 },
  status:      { type: String, default: 'available' },
  verified:    { type: Boolean, default: false },
  limit:       { type: Number, default: 0 },
}, { timestamps: true });



const TransactionSchema = new mongoose.Schema({
  request_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: true },
  offer_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Offer',   required: true },
  buyer_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  provider_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  buyer_name:   { type: String, default: '' },
  provider_name:{ type: String, default: '' },
  amount:       { type: Number, required: true },
  product_title:{ type: String, default: '' },
  product_link: { type: String, default: '' },
  category:     { type: String, default: '' },
  upi_ref:      { type: String, default: '' },
  tracking_id:  { type: String, default: '' },
  courier:      { type: String, default: '' },
  
  // NEW: Real card discount amount (in rupees, scraped from product page)
  card_discount_amount:  { type: Number, default: 0 },        // Actual ₹ amount from card offer
  customer_savings:      { type: Number, default: 0 },        // card_discount_amount × 0.50 (buyer reward)
  provider_earning:      { type: Number, default: 0 },        // card_discount_amount × 0.35 (seller reward)
  platform_commission:   { type: Number, default: 0 },        // card_discount_amount × 0.15 (platform fee)
  discount_source:       { type: String, default: 'scraped' }, // 'scraped' | 'estimated_fallback' | 'manual'
  
  status: {
    type: String,
    enum: [
      'pending_payment',
      'payment_received',
      'tracking_pending',
      'tracking_submitted',
      'completed',
      'refunded',
      'cancelled',
    ],
    default: 'pending_payment',
  },
  payment_at:     { type: Date },
  tracking_due_at:{ type: Date },
  completed_at:   { type: Date },
  refunded_at:    { type: Date },
}, { timestamps: true });

const NotificationSchema = new mongoose.Schema({
  user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:       { type: String, default: 'info' },
  title:      { type: String, default: '' },
  message:    { type: String, default: '' },
  action_url: { type: String, default: '' },
  tx_id:      { type: String, default: '' },
  read:       { type: Boolean, default: false },
}, { timestamps: true });



export const User         = mongoose.models.User         || mongoose.model('User', UserSchema);
export const Request      = mongoose.models.Request      || mongoose.model('Request', RequestSchema);
export const Offer        = mongoose.models.Offer        || mongoose.model('Offer', OfferSchema);

export const Transaction  = mongoose.models.Transaction  || mongoose.model('Transaction', TransactionSchema);
export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
