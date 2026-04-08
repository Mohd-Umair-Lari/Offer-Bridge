import { getDatabase } from './mongodb';
import { serializeArray, serializeDocument } from './serializeData';

/**
 * MongoDB Service Layer
 * Handles all database operations with MongoDB
 * Maintains consistent API for data access across the app
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
        data: {
          requests: serializeArray(requests),
          offers: serializeArray(offers),
          escrow: serializeArray(escrow),
          disputes: serializeArray(disputes),
        },
        error: null,
      };
    } catch (error) {
      console.error('[MongoDB] Fetch error:', error?.message);
      return {
        data: null,
        error: error?.message || 'Failed to fetch data',
      };
    }
  },

  // ── REQUESTS ──
  async getRequests(limit = 50) {
    try {
      const db = await getDatabase();
      const data = await db.collection('requests').find({}).limit(limit).toArray();
      return { data: serializeArray(data), error: null };
    } catch (error) {
      return { data: null, error: error?.message || 'Failed to fetch requests' };
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
      return { data: serializeDocument({ ...doc, _id: result.insertedId }), error: null };
    } catch (error) {
      console.error('[MongoDB] Insert request error:', error?.message);
      return { data: null, error: error?.message || 'Failed to insert request' };
    }
  },

  // ── OFFERS/CARDS ──
  async getOffers(limit = 50) {
    try {
      const db = await getDatabase();
      const data = await db.collection('offers').find({}).limit(limit).toArray();
      return { data: serializeArray(data), error: null };
    } catch (error) {
      return { data: null, error: error?.message || 'Failed to fetch offers' };
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
      return { data: serializeDocument({ ...doc, _id: result.insertedId }), error: null };
    } catch (error) {
      console.error('[MongoDB] Insert offer error:', error?.message);
      return { data: null, error: error?.message || 'Failed to insert offer' };
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
      return { data: null, error: error?.message || 'Failed to delete offer' };
    }
  },

  async updateOfferStatus(offerId, isPublic) {
    try {
      const db = await getDatabase();
      const { ObjectId } = await import('mongodb');
      const result = await db.collection('offers').updateOne(
        { _id: new ObjectId(offerId) },
        { $set: { is_public: isPublic, updated_at: new Date() } }
      );
      console.log('[MongoDB] Offer visibility updated:', isPublic ? 'public' : 'private');
      return { data: result, error: null };
    } catch (error) {
      console.error('[MongoDB] Update offer error:', error?.message);
      return { data: null, error: error?.message || 'Failed to update offer' };
    }
  },

  // ── ESCROW ──
  async getEscrow(limit = 50) {
    try {
      const db = await getDatabase();
      const data = await db.collection('escrow').find({}).limit(limit).toArray();
      return { data: serializeArray(data), error: null };
    } catch (error) {
      return { data: null, error: error?.message || 'Failed to fetch escrow' };
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
      return { data: null, error: error?.message || 'Failed to update escrow' };
    }
  },

  // ── DISPUTES ──
  async getDisputes(limit = 50) {
    try {
      const db = await getDatabase();
      const data = await db.collection('disputes').find({}).limit(limit).toArray();
      return { data: serializeArray(data), error: null };
    } catch (error) {
      return { data: null, error: error?.message || 'Failed to fetch disputes' };
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
      return { data: null, error: error?.message || 'Failed to update dispute' };
    }
  },

  // ── PROFILES ──
  async getProfile(userId) {
    try {
      const db = await getDatabase();
      const data = await db.collection('profiles').findOne({ user_id: userId });
      return { data: serializeDocument(data), error: null };
    } catch (error) {
      return { data: null, error: error?.message || 'Failed to fetch profile' };
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
      return { data: serializeDocument({ ...doc, _id: result.insertedId }), error: null };
    } catch (error) {
      console.error('[MongoDB] Create profile error:', error?.message);
      return { data: null, error: error?.message || 'Failed to create profile' };
    }
  },
};
