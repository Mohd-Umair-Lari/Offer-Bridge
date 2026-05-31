/**
 * Earnings Calculator - GoZivo Business Model v2
 * 
 * Split: 50% Customer | 35% Provider | 15% Platform
 */

export function calculateEarnings(amount, discountPercent) {
  const discountValue = amount * (discountPercent / 100);
  
  return {
    card_discount_percent: discountPercent,
    customer_savings: Math.round(discountValue * 0.50),      // 50%
    provider_earning: Math.round(discountValue * 0.35),      // 35%
    platform_commission: Math.round(discountValue * 0.15),   // 15%
  };
}

/**
 * Estimate provider earnings in Browse Requests
 * @param {Number} amount - Transaction amount
 * @param {Number} discountPercent - Card discount percentage
 * @returns {Number} Provider earning amount
 */
export function estimateProviderEarning(amount, discountPercent = 5) {
  return Math.round(amount * (discountPercent / 100) * 0.35);
}

/**
 * Format earnings breakdown for display
 * @param {Number} amount
 * @param {Object} earnings - Result from calculateEarnings()
 * @returns {Object} Formatted for UI display
 */
export function formatEarningsBreakdown(amount, earnings) {
  const discountValue = amount * (earnings.card_discount_percent / 100);
  
  return {
    amount: amount.toLocaleString('en-IN'),
    discount_percent: `${earnings.card_discount_percent}%`,
    discount_value: `₹${Math.round(discountValue).toLocaleString('en-IN')}`,
    customer_savings: `₹${earnings.customer_savings.toLocaleString('en-IN')} (50%)`,
    provider_earning: `₹${earnings.provider_earning.toLocaleString('en-IN')} (35%)`,
    platform_commission: `₹${earnings.platform_commission.toLocaleString('en-IN')} (15%)`,
  };
}

export default {
  calculateEarnings,
  estimateProviderEarning,
  formatEarningsBreakdown,
};
