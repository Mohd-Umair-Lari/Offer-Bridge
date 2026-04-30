import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  fullName: { type: String, default: '' },
  role:     { type: String, enum: ['admin', 'customer', 'provider', 'customer_provider'], default: 'customer' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const RequestSchema = new mongoose.Schema({
  user_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:         { type: String, required: true },
  amount:        { type: Number, required: true },
  category:      { type: String, default: '' },
  deadline:      { type: String, default: '' },
  description:   { type: String, default: '' },
  product_link:  { type: String, default: '' },
  required_card: { type: String, default: 'Any' },
  is_public:     { type: Boolean, default: true },
  status:        { type: String, enum: ['pending', 'matched', 'completed', 'cancelled'], default: 'pending' },
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

const EscrowSchema = new mongoose.Schema({
  deal_id:     { type: String, default: '' },
  buyer:       { type: String, default: '' },
  cardholder:  { type: String, default: '' },
  item:        { type: String, default: '' },
  amount:      { type: Number, default: 0 },
  fee:         { type: Number, default: 0 },
  status:      { type: String, enum: ['held', 'releasing', 'released', 'refunded'], default: 'held' },
}, { timestamps: true });

// Payment Transaction — full lifecycle
const TransactionSchema = new mongoose.Schema({
  request_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: true },
  offer_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Offer',   required: true },
  buyer_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  provider_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  buyer_name:   { type: String, default: '' },
  provider_name:{ type: String, default: '' },
  amount:       { type: Number, required: true },
  platform_fee: { type: Number, default: 0 },        // 2% retained by platform
  product_title:{ type: String, default: '' },
  product_link: { type: String, default: '' },
  category:     { type: String, default: '' },
  upi_ref:      { type: String, default: '' },        // UPI transaction reference
  escrow_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Escrow' },
  tracking_id:  { type: String, default: '' },
  courier:      { type: String, default: '' },
  status: {
    type: String,
    enum: [
      'pending_payment',   // offer made, waiting consumer to pay
      'payment_received',  // consumer paid → escrow held
      'tracking_pending',  // provider must submit tracking in 24h
      'tracking_submitted',// provider gave tracking ID
      'completed',         // deal done, funds released to provider
      'refunded',          // provider didn't submit → auto-refund to consumer
      'cancelled',
    ],
    default: 'pending_payment',
  },
  payment_at:     { type: Date },
  tracking_due_at:{ type: Date },   // payment_at + 24h
  completed_at:   { type: Date },
  refunded_at:    { type: Date },
}, { timestamps: true });

// Per-user notification
const NotificationSchema = new mongoose.Schema({
  user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:       { type: String, default: 'info' },  // info | payment | tracking | refund | action
  title:      { type: String, default: '' },
  message:    { type: String, default: '' },
  action_url: { type: String, default: '' },
  tx_id:      { type: String, default: '' },      // related transaction id
  read:       { type: Boolean, default: false },
}, { timestamps: true });

const DisputeSchema = new mongoose.Schema({
  dispute_id:  { type: String, default: '' },
  buyer:       { type: String, default: '' },
  cardholder:  { type: String, default: '' },
  item:        { type: String, default: '' },
  amount:      { type: Number, default: 0 },
  reason:      { type: String, default: '' },
  status:      { type: String, enum: ['open', 'investigating', 'resolved'], default: 'open' },
  priority:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
}, { timestamps: true });

// Prevent model re-compilation in dev (hot reload)
export const User         = mongoose.models.User         || mongoose.model('User', UserSchema);
export const Request      = mongoose.models.Request      || mongoose.model('Request', RequestSchema);
export const Offer        = mongoose.models.Offer        || mongoose.model('Offer', OfferSchema);
export const Escrow       = mongoose.models.Escrow       || mongoose.model('Escrow', EscrowSchema);
export const Dispute      = mongoose.models.Dispute      || mongoose.model('Dispute', DisputeSchema);
export const Transaction  = mongoose.models.Transaction  || mongoose.model('Transaction', TransactionSchema);
export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
