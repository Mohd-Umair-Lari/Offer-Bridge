"use client";
import { useState, useMemo } from 'react';
import { Plus, CreditCard, CheckCircle2, Tag, Trash2, Globe, Lock } from 'lucide-react';

// Convert ISO date (YYYY-MM-DD) to MM/YY for card display
function isoToMonthYear(isoDate) {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length < 2) return isoDate;
  const [year, month] = parts;
  return `${month}/${year.slice(2)}`;
}

export default function MyCards({ offers, userId, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all', 'marketplace', 'private'
  const [publishing, setPublishing] = useState(null); // Track which card is being published
  const [newCard, setNewCard] = useState({ bank: 'HDFC Bank', name: '', last4: '', expiry: '', limit: '', isPublic: true });

  const cards = useMemo(() => {
    if (!offers) return { all: [], marketplace: [], private: [] };
    
    const allCards = offers.map(o => ({
      _id: o._id,
      id: o._id,
      name: o.card_name,
      type: o.card_type || 'Visa',
      last4: o.last4 || '0000',
      expiry: isoToMonthYear(o.expiry) || '12/28',
      bank: o.bank || 'Other',
      gradient: 'from-[#1a1a2e] to-[#185FA5]',
      offers: o.categories?.length ? o.categories : ['Shopping', 'Electronics'],
      active_offers: o.deals_done || 0,
      status: o.status || 'active',
      earnings: o.cashback || 0,
      limit: o.max_amount || 0,
      is_public: o.is_public !== false,
      isReal: true
    }));

    const marketplace = allCards.filter(c => c.is_public);
    const onlyPrivate = allCards.filter(c => !c.is_public);
    
    return { all: allCards, marketplace, private: onlyPrivate };
  }, [offers]);

  // Get filtered cards based on selection
  const displayedCards = 
    filterType === 'marketplace' ? cards.marketplace : 
    filterType === 'private' ? cards.private : 
    cards.all;

  const handleRemove = async (id, isReal) => {
    if (!isReal) return; // Cannot delete mock cards from DB
    try {
      const res = await fetch(`/api/offers?id=${id}`, { method: 'DELETE' });
      if (res.ok && onRefresh) onRefresh();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handlePublish = async (cardId, currentIsPublic, cardData) => {
    setPublishing(cardId);
    try {
      // Toggle the public status: if currently public, make private; if private, make public
      const newPublicStatus = !currentIsPublic;
      const action = newPublicStatus ? 'published to marketplace' : 'removed from marketplace';
      
      const res = await fetch('/api/offers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: cardId,
          is_public: newPublicStatus,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error('Publish error:', json.error);
        alert('Error updating card:\n' + (json.error || 'Unknown error'));
      } else {
        console.log(`[MyCards] Card ${action} successfully`);
        // Refresh the cards to show updated status
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Publish error:', error);
      alert('Error updating card: ' + error.message);
    } finally {
      setPublishing(null);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newCard.name || !newCard.last4 || !newCard.expiry || !newCard.limit) return;
    setIsSubmitting(true);

    // Convert MM/YY to standard YYYY-MM-DD for MongoDB
    let expiryDate = null;
    if (newCard.expiry.includes('/')) {
      const [mm, yy] = newCard.expiry.split('/');
      if (mm && yy) expiryDate = `20${yy}-${mm}-01`;
    }

    const offerData = {
      user_id: userId,
      bank: newCard.bank,
      card_name: newCard.name,
      card_type: 'Visa',
      last4: String(newCard.last4),
      expiry: expiryDate,
      max_amount: Number(newCard.limit),
      is_public: newCard.isPublic,
      status: 'available',
      holder_name: newCard.bank
    };

    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offerData),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error('API insert error:', json.error);
        alert('Error saving card to database:\n' + (json.error || 'Unknown error'));
      } else {
        setNewCard({ bank: 'HDFC Bank', name: '', last4: '', expiry: '', limit: '', isPublic: true });
        setShowAdd(false);
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Request error:', error);
      alert('Error saving card to database:\n' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1a1a2e]">My Cards</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your credit cards and their active offers</p>
        </div>
        <button
          id="add-card-btn"
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#185FA5] text-white text-sm font-semibold rounded-xl hover:bg-[#145085] active:scale-95 transition"
        >
          <Plus size={15} /> Add Card
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl w-fit">
        {[
          { id: 'all', label: 'All Cards', icon: CreditCard, count: cards.all.length },
          { id: 'marketplace', label: 'Marketplace', icon: Globe, count: cards.marketplace.length },
          { id: 'private', label: 'Private', icon: Lock, count: cards.private.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
              filterType === tab.id
                ? 'bg-white text-[#185FA5] shadow-sm'
                : 'text-gray-600 hover:text-[#1a1a2e]'
            }`}
          >
            <tab.icon size={14} />
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-[#185FA5]/20 p-5 space-y-4 shadow-sm animate-fade-in">
          <p className="text-sm font-semibold text-[#1a1a2e]">Add New Card</p>
          <div className="grid grid-cols-4 gap-3">
            <select
              id="card-bank"
              value={newCard.bank}
              onChange={(e) => setNewCard((p) => ({ ...p, bank: e.target.value }))}
              className="col-span-4 sm:col-span-1 px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#185FA5]/20"
            >
              <option value="HDFC Bank">HDFC Bank</option>
              <option value="SBI Card">SBI Card</option>
              <option value="ICICI Bank">ICICI Bank</option>
              <option value="Axis Bank">Axis Bank</option>
              <option value="Other">Other</option>
            </select>
            <input
              id="card-name"
              placeholder="Card name (e.g. Millennia)"
              value={newCard.name}
              onChange={(e) => setNewCard((p) => ({ ...p, name: e.target.value }))}
              className="col-span-4 sm:col-span-1 px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#185FA5]/20"
            />
            <input
              id="card-last4"
              placeholder="Last 4 digits"
              maxLength={4}
              value={newCard.last4}
              onChange={(e) => setNewCard((p) => ({ ...p, last4: e.target.value }))}
              className="col-span-2 sm:col-span-1 px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#185FA5]/20"
            />
            <input
              id="card-expiry"
              placeholder="MM/YY"
              maxLength={5}
              value={newCard.expiry}
              onChange={(e) => setNewCard((p) => ({ ...p, expiry: e.target.value }))}
              className="col-span-2 sm:col-span-1 px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#185FA5]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Card Limit (₹)</label>
              <input
                id="card-limit"
                type="number"
                placeholder="0"
                value={newCard.limit}
                onChange={(e) => setNewCard((p) => ({ ...p, limit: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#185FA5]/20"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2.5 border border-gray-200 rounded-xl bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newCard.isPublic}
                  onChange={(e) => setNewCard((p) => ({ ...p, isPublic: e.target.checked }))}
                  className="w-4 h-4 text-[#185FA5] rounded border-gray-300 focus:ring-[#185FA5]"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#1a1a2e]">Marketplace</span>
                  <span className="text-[9px] text-gray-400">vs Private Direct Matches</span>
                </div>
              </label>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-[#185FA5] text-white text-sm font-semibold rounded-xl hover:bg-[#145085] transition disabled:opacity-50">
              {isSubmitting ? 'Saving...' : 'Save Card'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-2 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {displayedCards.map((card) => (
          <div key={card._id} className="space-y-3">
            {/* Visual Card */}
            <div className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 text-white relative overflow-hidden shadow-lg aspect-[1.586/1]`}>
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative h-full flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-white/60 uppercase tracking-wider">{card.bank}</p>
                    <p className="font-bold text-sm mt-0.5">{card.name}</p>
                  </div>
                  <CreditCard size={20} className="text-white/60" />
                </div>
                <div>
                  <p className="text-lg font-mono tracking-widest">•••• •••• •••• {card.last4}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <p className="text-[9px] text-white/50 uppercase">Expires</p>
                      <p className="text-xs font-semibold">{card.expiry}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-white/50 uppercase">Type</p>
                      <p className="text-xs font-semibold">{card.type}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Details */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-700">Available Limit</p>
                  <p className="text-sm font-bold text-[#1a1a2e] mt-0.5">₹{(card.limit || card.earnings * 5).toLocaleString('en-IN')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${card.is_public !== false ? 'bg-[#E6F1FB] text-[#185FA5]' : 'bg-gray-100 text-gray-500'}`}>
                    {card.is_public !== false ? 'Public' : 'Private'}
                  </span>
                  {card.isReal && (
                    <button
                      id={`remove-card-${card._id}`}
                      onClick={() => handleRemove(card._id, card.isReal)}
                      className="p-1.5 text-gray-300 hover:text-red-400 transition rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                {card.offers?.filter(Boolean).map((offer, i) => (
                  <div key={`offer-${card._id}-${i}`} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                    {offer}
                  </div>
                ))}
              </div>

              <button
                onClick={() => handlePublish(card._id, card.is_public !== false, card)}
                disabled={publishing === card._id}
                className={`w-full py-2 border text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition ${
                  card.is_public !== false
                    ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100'
                    : 'border-[#185FA5] text-[#185FA5] hover:bg-[#E6F1FB]'
                } ${publishing === card._id ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {publishing === card._id ? (
                  <>
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    {card.is_public !== false ? (
                      <>
                        <Globe size={12} /> Remove from Marketplace
                      </>
                    ) : (
                      <>
                        <Globe size={12} /> Post to Marketplace
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {cards.all.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <CreditCard size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No cards added yet</p>
          <button onClick={() => setShowAdd(true)} className="mt-3 text-xs text-[#185FA5] hover:underline">Add your first card →</button>
        </div>
      )}

      {cards.all.length > 0 && displayedCards.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <CreditCard size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            {filterType === 'marketplace' && 'No marketplace cards. Add cards and enable marketplace sharing.'}
            {filterType === 'private' && 'No private cards. Add cards with marketplace disabled.'}
          </p>
        </div>
      )}
    </div>
  );
}
