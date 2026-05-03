import { adminDb, admin } from './firebase-admin';

export interface CardValueIndex {
  projectId: string;
  cardId: string;
  cardName: string;
  rarity: string;
  baseValue: number;
  floorPrice: number;
  lastSale: number;
  averageSale: number;
  highestSale: number;
  activeListings: number;
  totalSales: number;
  recentSales24h: number;
  rollingSales: number[]; // Last 20 sales
  mintedCount: number;
  supplyLimit: number | null;
  demandScore: number;
  scarcityScore: number;
  estimatedValue: number;
  priceChange24h: number;
  volume24h: number;
  trendingScore: number;
  updatedAt: any;
}

export interface Treasury {
  totalBalance: number;
  feesCollected: number;
  rewardsDistributed: number;
  lastUpdated: any;
}

export interface TreasuryEvent {
  type: 'fee' | 'reward' | 'adjustment';
  amount: number;
  source: 'market' | 'packs' | 'mint' | 'system';
  description?: string;
  createdAt: any;
}

export interface MarketControl {
  projectId: string;
  tradingPaused: boolean;
  packsEnabled: boolean;
  mintingEnabled: boolean;
  affectedCardIds: string[];
  reason: string;
  updatedAt: any;
}

export const MARKET_FEE_PERCENT = 0.05; // 5%
export const PACK_FEE_PERCENT = 0.10;   // 10%
export const SYSTEM_USER_ID = 'SOLGINE_BOT';

export const BASE_RARITY_VALUES: Record<string, number> = {
  common: 2,
  uncommon: 5,
  rare: 20,
  epic: 80,
  legendary: 300,
  mythic: 1500
};

/**
 * Calculates the Demand Score based on sales and active listings.
 * Hardened against wash trading by reducing weight of simple volume and 
 * adding a minimum valid price threshold check (conceptually, to be applied at recording).
 */
export function calculateDemandScore(
  totalSales: number, 
  activeListings: number, 
  recentSales24h: number,
  uniqueBuyers: number = 0
): number {
  // Hardened formula: (uniqueBuyers * 4) + (recentSales24h * 2) - (activeListings * 0.5)
  // We prioritize unique buyers to detect organic interest.
  const baseScore = (uniqueBuyers * 4) + (recentSales24h * 2) - (activeListings * 0.5);
  return Math.max(0, Math.min(100, baseScore));
}

/**
 * Calculates the Scarcity Score based on minted count and supply limit.
 */
export function calculateScarcityScore(mintedCount: number, supplyLimit: number | null, rarity: string): number {
  if (!supplyLimit) {
    // Fallback to rarity weight if supplyLimit is null
    const weights: Record<string, number> = {
      common: 10,
      uncommon: 25,
      rare: 50,
      epic: 75,
      legendary: 90,
      mythic: 100
    };
    return weights[rarity.toLowerCase()] || 10;
  }
  
  // scarcityScore = (1 - (mintedCount / supplyLimit)) * 100
  const score = (1 - (mintedCount / supplyLimit)) * 100;
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculates the Final Estimated Value based on market data and scores.
 */
export function calculateEstimatedValue(
  averageSale: number, 
  baseRarityValue: number, 
  demandScore: number, 
  scarcityScore: number
): number {
  const base = averageSale || baseRarityValue;
  // estimatedValue = (averageSale OR base rarity value) × (1 + demandScore/100) × (1 + scarcityScore/100)
  const value = base * (1 + demandScore / 100) * (1 + scarcityScore / 100);
  return Math.round(value * 100) / 100;
}

/**
 * Calculates the Trending Score.
 */
export function calculateTrendingScore(recentSales: number, priceIncreasePercent: number): number {
  // trendingScore = recentSales × priceIncrease %
  return recentSales * (priceIncreasePercent / 100);
}

/**
 * Updates the value index for a specific card.
 */
export async function updateCardValueIndex(cardId: string) {
  if (!adminDb) return;

  const indexRef = adminDb.collection('cardValueIndex').doc(cardId);
  const indexSnap = await indexRef.get();
  
  // Fetch active listings for floor price
  const listingsSnap = await adminDb.collection('marketListings')
    .where('cardId', '==', cardId)
    .where('status', '==', 'active')
    .orderBy('price', 'asc')
    .limit(1)
    .get();

  const floorPrice = listingsSnap.empty ? 0 : listingsSnap.docs[0].data().price;
  const activeListings = (await adminDb.collection('marketListings')
    .where('cardId', '==', cardId)
    .where('status', '==', 'active')
    .count()
    .get()).data().count;

  // Fetch recent sales (24h)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentSalesSnap = await adminDb.collection('transactions')
    .where('cardId', '==', cardId)
    .where('timestamp', '>=', oneDayAgo)
    .get();

  const recentSales24h = recentSalesSnap.size;
  const volume24h = recentSalesSnap.docs.reduce((sum: number, doc: any) => sum + (doc.data().price || 0), 0);
  
  // Count unique buyers for anti-manipulation demand score
  const uniqueBuyers = new Set(recentSalesSnap.docs.map((doc: any) => doc.data().buyerUid)).size;

  // Get price from 24h ago for priceChange
  const sales24hAgoSnap = await adminDb.collection('transactions')
    .where('cardId', '==', cardId)
    .where('timestamp', '<=', oneDayAgo)
    .orderBy('timestamp', 'desc')
    .limit(1)
    .get();

  const oldPrice = sales24hAgoSnap.empty ? 0 : sales24hAgoSnap.docs[0].data().price;
  
  if (indexSnap.exists) {
    const data = indexSnap.data() as CardValueIndex;
    const currentPrice = data.lastSale || 0;
    const priceChange24h = oldPrice === 0 ? 0 : ((currentPrice - oldPrice) / oldPrice) * 100;

    const demandScore = calculateDemandScore(data.totalSales, activeListings, recentSales24h, uniqueBuyers);
    const scarcityScore = calculateScarcityScore(data.mintedCount, data.supplyLimit, data.rarity);
    const estimatedValue = calculateEstimatedValue(data.averageSale, BASE_RARITY_VALUES[data.rarity.toLowerCase()] || 2, demandScore, scarcityScore);
    const trendingScore = calculateTrendingScore(recentSales24h, priceChange24h);

    await indexRef.update({
      floorPrice,
      activeListings,
      recentSales24h,
      uniqueBuyers24h: uniqueBuyers,
      volume24h,
      priceChange24h: Math.round(priceChange24h * 100) / 100,
      demandScore: Math.round(demandScore * 10) / 10,
      scarcityScore: Math.round(scarcityScore * 10) / 10,
      estimatedValue,
      trendingScore: Math.round(trendingScore * 100) / 100,
      updatedAt: new Date()
    });
  }
}

/**
 * Records a transaction in the treasury with strict balance separation.
 * Prevents "phantom liquidity" by splitting fees into platform and project accounts.
 */
export async function recordTreasuryTransaction(
  transaction: FirebaseFirestore.Transaction | FirebaseFirestore.WriteBatch,
  amounts: {
    gross: number;
    platformFee: number;
    creatorFee: number;
    sellerNet: number;
  },
  type: 'fee' | 'reward' | 'adjustment',
  source: 'market' | 'packs' | 'mint' | 'system',
  projectId: string = 'solgine-core',
  transactionId: string = 'internal',
  description?: string
) {
  const globalTreasuryRef = adminDb.collection('treasury').doc('main');
  const projectTreasuryRef = adminDb.collection('projects').doc(projectId).collection('treasury').doc('main');
  const eventRef = adminDb.collection('treasuryEvents').doc();

  // 1. Global Treasury: Only platform fees and total volume
  const globalUpdate = {
    platformCommissionBalance: admin.firestore.FieldValue.increment(amounts.platformFee),
    totalPlatformFees: admin.firestore.FieldValue.increment(amounts.platformFee),
    totalVolumeProcessed: admin.firestore.FieldValue.increment(amounts.gross),
    lastUpdated: new Date()
  };

  // 2. Project Treasury: Only creator revenue and project volume
  const projectUpdate = {
    creatorRevenueBalance: admin.firestore.FieldValue.increment(amounts.creatorFee),
    totalCreatorRevenue: admin.firestore.FieldValue.increment(amounts.creatorFee),
    projectVolumeProcessed: admin.firestore.FieldValue.increment(amounts.gross),
    lastUpdated: new Date()
  };

  if (transaction instanceof admin.firestore.Transaction) {
    transaction.set(globalTreasuryRef, globalUpdate, { merge: true });
    if (projectId !== 'solgine-core') {
      transaction.set(projectTreasuryRef, projectUpdate, { merge: true });
    }
    transaction.set(eventRef, {
      projectId,
      transactionId,
      type,
      amounts,
      source,
      description,
      createdAt: new Date()
    });
  } else {
    transaction.set(globalTreasuryRef, globalUpdate, { merge: true });
    if (projectId !== 'solgine-core') {
      transaction.set(projectTreasuryRef, projectUpdate, { merge: true });
    }
    transaction.set(eventRef, {
      projectId,
      transactionId,
      type,
      amounts,
      source,
      description,
      createdAt: new Date()
    });
  }
}

/**
 * Checks for market manipulation (wash trading, price spikes).
 */
export async function checkMarketManipulation(
  buyerId: string,
  sellerId: string,
  cardId: string,
  price: number,
  estimatedValue: number
) {
  const flags = [];

  // 1. Wash Trading Detection: Recent trades between same parties
  const recentTradesSnap = await adminDb.collection('transactions')
    .where('buyerUid', 'in', [buyerId, sellerId])
    .where('sellerUid', 'in', [buyerId, sellerId])
    .where('timestamp', '>=', new Date(Date.now() - 15 * 60 * 1000)) // 15 mins
    .get();

  if (recentTradesSnap.size >= 2) {
    flags.push('WASH_TRADING');
  }

  // 2. Price Spike Detection: > 300% of estimated value
  if (estimatedValue > 0 && price > estimatedValue * 3) {
    flags.push('PRICE_MANIPULATION');
  }

  // 3. Rapid Sell/Buy same card
  const rapidTurnoverSnap = await adminDb.collection('transactions')
    .where('cardId', '==', cardId)
    .where('buyerUid', '==', buyerId)
    .where('timestamp', '>=', new Date(Date.now() - 5 * 60 * 1000)) // 5 mins
    .get();

  if (rapidTurnoverSnap.size >= 3) {
    flags.push('BOT_BEHAVIOR');
  }

  if (flags.length > 0) {
    await adminDb.collection('marketFlags').add({
      buyerUid: buyerId,
      sellerUid: sellerId,
      cardId,
      price,
      flags,
      timestamp: new Date(),
      status: 'pending_review'
    });
  }

  return flags;
}

/**
 * Retrieves the current system status and kill switch flags for a specific project.
 */
export async function getSystemStatus(projectId: string = 'solgine-core'): Promise<MarketControl> {
  const statusRef = adminDb.collection('systemStatus').doc(projectId);
  const snap = await statusRef.get();
  
  if (!snap.exists) {
    // Default fallback
    return {
      projectId,
      tradingPaused: false,
      packsEnabled: true,
      mintingEnabled: true,
      affectedCardIds: [],
      reason: '',
      updatedAt: new Date()
    };
  }
  
  return snap.data() as MarketControl;
}
