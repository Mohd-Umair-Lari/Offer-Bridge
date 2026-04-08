import { getDatabase } from './mongodb';

/**
 * MongoDB Service Layer
 * Replaces all Supabase queries with MongoDB equivalents
 * Maintains the same API structure for easy migration
 */

export const mongoService = {
  // ── FETCH ALL DATA (for dashboard) ──
  async fetchAll() {
    try {
      const db = await getDatabase();

      const [requests, offers, escrow, disputes] = await Promise.all([
        db.collection('requests').find({}).limit(50).toArray(),
        db.collection('offers').find({}).limit(50).toArray(),
        db.collection('escrow').find({}).limit(50).toArray(),
        db.collection('disputes').find({}).limit(50).toArray(),
      ]);

      console.log('[MongoDB] Fetched all:', { requests: requests.length, offers: offers.length, escrow: escrow.length, disputes: disputes.length });

      return {
        requests: { data: requests, error: null },
        offers: { data: offers, error: null },
        escrow: { data: escrow, error: null },
        disputes: { data: disputes, error: null },
      };
    } catch (error) {
      console.error('[MongoDB] Fetch error:', error?.message);
      return {
        requests: { data: [], error },
        offers: { data: [], error },
        escrow: { data: [], error },
        disputes: { data: [], error },
      };
    }
  },

  // ── REQUESTS ──
  async getRequests(limit = 50) {
    try {
      const db = await getDatabase();
      const data = await db.collection('requests').find({}).limit(limit).toArray();
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async insertRequest(request) {
    try {
      const db = await getDatabase();
      const doc = {
        ...request,
        user_id: request.user_id || 'anonymous',
        created_at: new Date(),
        updated_at: new Date(),
      };
      const result = await db.collection('requests').insertOne(doc);
      console.log('[MongoDB] Request inserted:', result.insertedId);
      return { data: { ...doc, _id: result.insertedId }, error: null };
    } catch (error) {
      console.error('[MongoDB] Insert request error:', error?.message);
      return { data: null, error };
    }
  },

  // ── OFFERS/CARDS ──
  async getOffers(limit = 50) {
    try {
      const db = await getDatabase();
      const data = await db.collection('offers').find({}).limit(limit).toArray();
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async insertOffer(offer) {
    try {
      const db = await getDatabase();
      const doc = {
        ...offer,
        user_id: offer.user_id || 'anonymous',
        created_at: new Date(),
        updated_at: new Date(),
      };
      const result = await db.collection('offers').insertOne(doc);
      console.log('[MongoDB] Offer inserted:', result.insertedId);
      return { data: { ...doc, _id: result.insertedId }, error: null };
    } catch (error) {
      console.error('[MongoDB] Insert offer error:', error?.message);
      return { data: null, error };
    }
  },

  async deleteOffer(offerId) {
    try {
      const db = await getDatabase();
      const { ObjectId } = await import('mongodb');
      const result = await db.collection('offers').deleteOne({ _id: new ObjectId(offerId) });
      console.log('[MongoDB] Offer deleted');
      return { data: result, error: null };
    } catch (error) {
      console.error('[MongoDB] Delete offer error:', error?.message);
      return { data: null, error };
    }
  },

  // ── ESCROW ──
  async getEscrow(limit = 50) {
    try {
      const db = await getDatabase();
      const data = await db.collection('escrow').find({}).limit(limit).toArray();
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async updateEscrowStatus(escrowId, newStatus) {
    try {
      const db = await getDatabase();
      const { ObjectId } = await import('mongodb');
      const result = await db.collection('escrow').updateOne(
        { _id: new ObjectId(escrowId) },
        { $set: { status: newStatus, updated_at: new Date() } }
      );
      console.log('[MongoDB] Escrow updated');
      return { data: result, error: null };
    } catch (error) {
      console.error('[MongoDB] Update escrow error:', error?.message);
      return { data: null, error };
    }
  },

  // ── DISPUTES ──
  async getDisputes(limit = 50) {
    try {
      const db = await getDatabase();
      const data = await db.collection('disputes').find({}).limit(limit).toArray();
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async updateDisputeStatus(disputeId, newStatus) {
    try {
      const db = await getDatabase();
      const { ObjectId } = await import('mongodb');
      const result = await db.collection('disputes').updateOne(
        { _id: new ObjectId(disputeId) },
        { $set: { status: newStatus, updated_at: new Date() } }
      );
      console.log('[MongoDB] Dispute updated');
      return { data: result, error: null };
    } catch (error) {
      console.error('[MongoDB] Update dispute error:', error?.message);
      return { data: null, error };
    }
  },

  // ── PROFILES ──
  async getProfile(userId) {
    try {
      const db = await getDatabase();
      const data = await db.collection('profiles').findOne({ user_id: userId });
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async createProfile(profile) {
    try {
      const db = await getDatabase();
      const doc = {
        ...profile,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const result = await db.collection('profiles').insertOne(doc);
      console.log('[MongoDB] Profile created:', result.insertedId);
      return { data: { ...doc, _id: result.insertedId }, error: null };
    } catch (error) {
      console.error('[MongoDB] Create profile error:', error?.message);
      return { data: null, error };
    }
  },
};
