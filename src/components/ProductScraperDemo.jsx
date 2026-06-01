import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Sparkles, CheckCircle2, AlertCircle, ShoppingBag, CreditCard, Clock } from 'lucide-react';

export default function ProductScraperDemo() {
  const [inputUrl, setInputUrl] = useState('');
  const [debouncedUrl, setDebouncedUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [cached, setCached] = useState(false);

  // Debounce the input URL changes
  useEffect(() => {
    if (!inputUrl) {
      setDebouncedUrl('');
      setData(null);
      setError(null);
      return;
    }

    const timer = setTimeout(() => {
      // Basic validation for Amazon or Flipkart before setting
      const lower = inputUrl.toLowerCase();
      if (lower.includes('amazon.in') || lower.includes('amazon.com') || lower.includes('flipkart.com')) {
        setDebouncedUrl(inputUrl);
        setError(null);
      } else {
        setError('Please enter a valid Amazon India or Flipkart product URL');
      }
    }, 1000); // 1-second debounce timeout

    return () => clearTimeout(timer);
  }, [inputUrl]);

  // Fetch product scraper API route
  const handleScrapeProduct = useCallback(async (url) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/scrape-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productUrl: url }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to analyze product. Please try again.');
      }

      if (result.success) {
        setData(result.data);
        setCached(result.cached);
      } else {
        throw new Error(result.error || 'Scraper completed but returned unsuccessful.');
      }
    } catch (err) {
      console.error('[Scraper Frontend Error]', err);
      setError(err.message || 'An unexpected error occurred while analyzing the product.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger when debouncedUrl is updated
  useEffect(() => {
    if (debouncedUrl) {
      handleScrapeProduct(debouncedUrl);
    }
  }, [debouncedUrl, handleScrapeProduct]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent flex items-center justify-center gap-2">
          <Sparkles className="w-8 h-8 text-blue-400 animate-pulse" />
          Offer-Bridge Smart Crawler
        </h2>
        <p className="mt-2 text-slate-400 text-sm">
          Paste any Amazon or Flipkart product URL to extract live credit card discounts instantly.
        </p>
      </div>

      {/* Input Section */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {loading ? (
            <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-slate-400" />
          )}
        </div>
        <input
          type="url"
          className="block w-full pl-10 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-500 text-slate-200 transition duration-200 text-sm"
          placeholder="Paste Amazon or Flipkart product link (e.g. https://www.amazon.in/dp/...)"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
        />
      </div>

      {/* Status & Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-950/40 border border-red-900/50 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-red-300">Scraping Error</h4>
            <p className="text-xs text-red-400/90 mt-1">{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="py-12 flex flex-col items-center justify-center gap-4 bg-slate-950/30 border border-dashed border-slate-800 rounded-xl">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <div className="text-center">
            <p className="text-sm font-medium text-slate-300">Fetching Product details...</p>
            <p className="text-xs text-slate-500 mt-1">Bypassing bot-detection and scraping available bank offers</p>
          </div>
        </div>
      )}

      {/* Results Display */}
      {!loading && data && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          
          {/* Left Column - Product Main Card */}
          <div className="md:col-span-2 bg-slate-950/50 border border-slate-800 rounded-xl p-4 flex flex-col items-center">
            <div className="relative w-full aspect-square bg-white rounded-lg p-2 overflow-hidden flex items-center justify-center border border-slate-800 mb-4">
              {data.image ? (
                <img
                  src={data.image}
                  alt={data.title}
                  className="max-h-full max-w-full object-contain transition-all hover:scale-105 duration-300"
                />
              ) : (
                <ShoppingBag className="w-16 h-16 text-slate-300" />
              )}
              {cached && (
                <div className="absolute top-2 right-2 bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                  <Clock className="w-3 h-3" />
                  Cached
                </div>
              )}
            </div>
            
            <h3 className="text-sm font-semibold text-slate-200 line-clamp-2 text-center w-full" title={data.title}>
              {data.title}
            </h3>
            <div className="mt-2 text-slate-400 capitalize text-xs bg-slate-800 px-3 py-1 rounded-full font-semibold">
              {data.domain} Product
            </div>
          </div>

          {/* Right Column - Calculations & Card offers */}
          <div className="md:col-span-3 flex flex-col gap-4">
            
            {/* Best Offer Promotion Card */}
            <div className="bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-indigo-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 opacity-10">
                <CreditCard className="w-32 h-32 text-indigo-400" />
              </div>

              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs uppercase tracking-wider font-extrabold text-indigo-400">Best Calculated Discount</span>
              </div>

              {data.bestOffer && data.bestOffer.discountAmount > 0 ? (
                <div>
                  <h4 className="text-2xl font-bold text-slate-100 mb-1">
                    Save ₹{data.bestOffer.discountAmount.toLocaleString('en-IN')}
                  </h4>
                  <p className="text-xs text-indigo-200 mb-4 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg inline-block">
                    {data.bestOffer.offerDescription}
                  </p>

                  {/* Math Breakdown */}
                  <div className="space-y-2 border-t border-indigo-900/50 pt-4 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>Original Product Price:</span>
                      <span className="font-semibold text-slate-300">₹{data.price.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-rose-400 font-medium">
                      <span>Card Discount Applied:</span>
                      <span>- ₹{data.bestOffer.discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-100 font-bold border-t border-slate-800/80 pt-2 text-base">
                      <span>Best Effective Price:</span>
                      <span className="text-emerald-400">₹{data.bestOffer.finalPriceAfterDiscount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="text-lg font-bold text-slate-300">No Eligible Offers Found</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    We crawled the page but didn't identify any standard credit card promotional discount terms or minimum values that apply.
                  </p>
                  <div className="mt-4 border-t border-slate-800/80 pt-4 flex justify-between text-slate-200 font-bold">
                    <span>Effective Price:</span>
                    <span>₹{data.price.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Scraped Raw Offers List */}
            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                Raw Scraped Offer Text ({data.rawOffers?.length || 0})
              </h4>

              {data.rawOffers && data.rawOffers.length > 0 ? (
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {data.rawOffers.map((offerText, index) => (
                    <div
                      key={index}
                      className="text-xs p-2 bg-slate-950/80 border border-slate-800/50 rounded-lg text-slate-300 leading-relaxed hover:border-slate-700/60 transition"
                    >
                      {offerText}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-4 text-center">
                  No bank offers text strings were found on the product page.
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* Helper Footer */}
      {!loading && !data && (
        <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl bg-slate-950/10">
          <ShoppingBag className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Paste a supported e-commerce link to begin real-time analysis.</p>
        </div>
      )}
    </div>
  );
}
