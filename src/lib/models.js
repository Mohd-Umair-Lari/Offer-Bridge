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
  status:      { type: String, enum: ['held', 'releasing', 'released'], default: 'held' },
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
export const User    = mongoose.models.User    || mongoose.model('User', UserSchema);
export const Request = mongoose.models.Request || mongoose.model('Request', RequestSchema);
export const Offer   = mongoose.models.Offer   || mongoose.model('Offer', OfferSchema);
export const Escrow  = mongoose.models.Escrow  || mongoose.model('Escrow', EscrowSchema);
export const Dispute = mongoose.models.Dispute || mongoose.model('Dispute', DisputeSchema);
