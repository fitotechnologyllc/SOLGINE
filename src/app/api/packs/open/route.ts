import { NextResponse } from 'next/server';
import { adminDb, adminAuth, adminApp } from '@/lib/firebase-admin';

const SEED_CARDS = [
  { id: 'c_pulse_reaper', name: 'Pulse Reaper', rarity: 'common', type: 'character', attack: 10, defense: 5, ability: 'Basic Strike', estimatedValue: 2, supplyLimit: 10000, mintedCount: 0 },
  { id: 'c_iron_phalanx', name: 'Iron Phalanx', rarity: 'common', type: 'character', attack: 5, defense: 12, ability: 'Shield Wall', estimatedValue: 2, supplyLimit: 10000, mintedCount: 0 },
  { id: 'c_nova_guardian', name: 'Nova Guardian', rarity: 'rare', type: 'character', attack: 25, defense: 20, ability: 'Nova Blast', estimatedValue: 20, supplyLimit: 5000, mintedCount: 0 },
  { id: 'c_void_walker', name: 'Void Walker', rarity: 'epic', type: 'character', attack: 50, defense: 30, ability: 'Void Step', estimatedValue: 80, supplyLimit: 1000, mintedCount: 0 },
  { id: 'c_celestial_dragon', name: 'Celestial Dragon', rarity: 'legendary', type: 'character', attack: 120, defense: 100, ability: 'Celestial Breath', estimatedValue: 300, supplyLimit: 100, mintedCount: 0 },
  { id: 'c_mythic_sol', name: 'Mythic Sol Dragon', rarity: 'mythic', type: 'character', attack: 300, defense: 250, ability: 'Solar Flare', estimatedValue: 1500, supplyLimit: 10, mintedCount: 0 }
];

export async function POST(req: Request) {
  try {
    console.log("REQUEST RECEIVED");
    console.log('Method:', req.method);
    
    // Check if Firebase Admin is configured
    if (!adminDb || !adminAuth) {
      console.warn("SERVER_FIREBASE_ADMIN_NOT_CONFIGURED");
      if (process.env.NODE_ENV === 'development') {
        return Response.json({
          success: true,
          cards: SEED_CARDS.slice(0, 5), // demo fallback
          saved: false,
          message: "Demo mode — Firebase Admin is not configured."
        });
      } else {
        return Response.json({
          success: false,
          errorCode: "SERVER_FIREBASE_ADMIN_NOT_CONFIGURED",
          message: "Firebase Admin is not configured for server pack opening."
        }, { status: 500 });
      }
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error("AUTH_REQUIRED: Missing or invalid Authorization header.");
    }
    
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const body = await req.json();
    const { packId } = body;

    console.log("USER:", userId);
    console.log("PACK ID:", packId);

    if (!packId) {
      throw new Error("INVALID_REQUEST: A valid pack ID is required.");
    }

    console.log("FETCHING PACK...");
    const packRef = adminDb.collection('boosterPacks').doc(packId);
    const packSnap = await packRef.get();
    
    if (!packSnap.exists) {
      throw new Error("PACK_NOT_FOUND");
    }
    
    const packData = packSnap.data();
    console.log("PACK DATA:", packData);

    console.log("FETCHING CARDS...");
    const cardsSnap = await adminDb.collection('cards').get();
    let allCards = cardsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as any));

    console.log("CARDS COUNT:", allCards.length);

    if (!allCards || allCards.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Database empty in dev mode. Seeding starter cards...');
        const batch = adminDb.batch();
        for (const seed of SEED_CARDS) {
          batch.set(adminDb.collection('cards').doc(seed.id), seed);
        }
        await batch.commit();
        allCards = SEED_CARDS;
        console.log('Seeded', SEED_CARDS.length, 'cards.');
      } else {
        throw new Error("NO_CARDS_IN_DATABASE");
      }
    }

    console.log("SELECTING CARDS...");
    const pulledCards: any[] = [];
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
    
    for (let i = 0; i < (packData?.cardsPerPack || 1); i++) {
      const roll = Math.random() * 100;
      let selectedRarity = 'common';
      
      let cumulative = 0;
      for (const [rarity, chance] of Object.entries(packData?.rarityOdds || { common: 100 })) {
        cumulative += (chance as number);
        if (roll <= cumulative) {
          selectedRarity = rarity.toLowerCase();
          break;
        }
      }

      let availableOfRarity = allCards.filter((c: any) => c.rarity?.toLowerCase() === selectedRarity);
      
      if (!availableOfRarity || availableOfRarity.length === 0) {
        console.log(`Warning: No cards found for rarity ${selectedRarity}. Attempting fallback.`);
        let currentRarityIndex = rarityOrder.indexOf(selectedRarity);
        
        while (availableOfRarity.length === 0 && currentRarityIndex > 0) {
          currentRarityIndex--;
          const fallbackRarity = rarityOrder[currentRarityIndex];
          availableOfRarity = allCards.filter((c: any) => c.rarity?.toLowerCase() === fallbackRarity);
        }
      }

      if (!availableOfRarity || availableOfRarity.length === 0) {
        availableOfRarity = allCards;
      }

      const randomCard = availableOfRarity[Math.floor(Math.random() * availableOfRarity.length)];
      if (randomCard) {
        pulledCards.push({
          id: randomCard.id,
          name: randomCard.name || 'Unknown',
          rarity: randomCard.rarity || 'common',
          attack: randomCard.attack || 0,
          defense: randomCard.defense || 0,
          ability: randomCard.ability || 'None',
          imageUrl: randomCard.imageUrl || '',
          estimatedValue: randomCard.estimatedValue || 0
        });
      }
    }

    if (!pulledCards || pulledCards.length === 0) {
      throw new Error("CARD_SELECTION_FAILED");
    }

    console.log("SELECTED:", pulledCards);

    console.log("SAVING COLLECTION...");
    const playerCollRef = adminDb.collection('playerCollections').doc(userId);
    const playerCollSnap = await playerCollRef.get();
    let existingCards = playerCollSnap.exists ? playerCollSnap.data()?.cards || [] : [];

    for (const pulled of pulledCards) {
      const idx = existingCards.findIndex((c: any) => c.cardId === pulled.id);
      if (idx >= 0) {
        existingCards[idx].count += 1;
      } else {
        existingCards.push({ cardId: pulled.id, count: 1 });
      }
    }

    const batch = adminDb.batch();
    batch.set(playerCollRef, { cards: existingCards }, { merge: true });

    console.log("WRITING PACK OPENING...");
    const openingRef = adminDb.collection('packOpenings').doc();
    batch.set(openingRef, {
      userId,
      packId,
      createdAt: new Date().toISOString(),
      cardsPulled: pulledCards.map((c: any) => c.id),
      source: 'off-chain'
    });

    const uniqueCards = Array.from(new Set(pulledCards.map((c: any) => c.id))).map(id => pulledCards.find((c: any) => c.id === id)!);
    for (const card of uniqueCards) {
      const indexRef = adminDb.collection('cardValueIndex').doc(card.id);
      const indexSnap = await indexRef.get();
      if (!indexSnap.exists) {
        const rarity = card.rarity.toLowerCase();
        let low = 1, high = 5;
        if (rarity === 'mythic') { low = 500; high = 2000; }
        else if (rarity === 'legendary') { low = 150; high = 500; }
        else if (rarity === 'epic') { low = 50; high = 150; }
        else if (rarity === 'rare') { low = 15; high = 50; }
        else if (rarity === 'uncommon') { low = 5; high = 15; }
        
        batch.set(indexRef, {
          cardId: card.id,
          cardName: card.name,
          rarity: card.rarity,
          estimatedValueLow: low,
          estimatedValueHigh: high,
          floorPrice: 0,
          lastSale: 0,
          averageSale: 0,
          highestSale: 0,
          totalSales: 0,
          activeListings: 0,
          rarityScore: (high + low) / 2,
          demandScore: 50,
          updatedAt: new Date().toISOString()
        });
      }
    }

    await batch.commit();

    console.log('--- PACK OPENING SUCCESS ---');
    return Response.json({ 
      success: true, 
      cards: pulledCards,
      saved: true
    });

  } catch (error: any) {
    console.error("PACK OPEN ERROR:", error);
    return Response.json({ 
      success: false, 
      message: error.message || "Internal pack error",
      stack: error.stack 
    }, { status: 500 });
  }
}
