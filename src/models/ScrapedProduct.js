import mongoose from 'mongoose';

const ScrapedProductSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  domain: {
    type: String,
    enum: ['amazon', 'flipkart', 'myntra'],
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
  },
  image: {
    type: String,
    default: '',
  },
  rawOffers: {
    type: [String],
    default: [],
  },
  bestOffer: {
    bestOfferBank: { type: String, default: '' },
    discountAmount: { type: Number, default: 0 },
    finalPriceAfterDiscount: { type: Number, default: 0 },
    offerDescription: { type: String, default: '' },
  },
  lastScrapedAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true, // This automatically provides createdAt and updatedAt fields
});

// Create index for automatic cleaning or checking updated time
ScrapedProductSchema.index({ updatedAt: -1 });

export const ScrapedProduct = mongoose.models.ScrapedProduct || mongoose.model('ScrapedProduct', ScrapedProductSchema);
export default ScrapedProduct;
