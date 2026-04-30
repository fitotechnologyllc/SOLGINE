import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const SEED_PACKS = [
  { id: 'pack_starter', name: 'Starter Pack', description: 'Begin your journey.', price: 10, cardsPerPack: 3, status: 'active', rarityOdds: { common: 65, uncommon: 20, rare: 10, epic: 4, legendary: 0.9, mythic: 0.1 }, visualStyle: 'teal' },
  { id: 'pack_standard', name: 'Standard Pack', description: 'A solid addition.', price: 50, cardsPerPack: 5, status: 'active', rarityOdds: { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 0.9, mythic: 0.1 }, visualStyle: 'blue' },
  { id: 'pack_premium', name: 'Premium Pack', description: 'High-end assets.', price: 250, cardsPerPack: 7, status: 'active', rarityOdds: { common: 20, uncommon: 30, rare: 30, epic: 15, legendary: 4, mythic: 1 }, visualStyle: 'purple' },
  { id: 'pack_elite', name: 'Elite Pack', description: 'For the veterans.', price: 1000, cardsPerPack: 10, status: 'active', rarityOdds: { common: 0, uncommon: 10, rare: 40, epic: 30, legendary: 15, mythic: 5 }, visualStyle: 'red' },
];

const SEED_CARDS = [
  { id: 'card_1', name: 'Pulse Reaper', type: 'character', rarity: 'common', attack: 10, defense: 5, estimatedValue: 1, imageUrl: 'https://firebasestorage.googleapis.com/v0/b/solgine-3a3c6.firebasestorage.app/o/cards%2Fpulse_reaper.png?alt=media' },
  { id: 'card_2', name: 'Iron Phalanx', type: 'character', rarity: 'common', attack: 5, defense: 15, estimatedValue: 1, imageUrl: 'https://firebasestorage.googleapis.com/v0/b/solgine-3a3c6.firebasestorage.app/o/cards%2Firon_phalanx.png?alt=media' },
  { id: 'card_3', name: 'Neon Strider', type: 'character', rarity: 'uncommon', attack: 15, defense: 10, estimatedValue: 5, imageUrl: 'https://firebasestorage.googleapis.com/v0/b/solgine-3a3c6.firebasestorage.app/o/cards%2Fneon_strider.png?alt=media' },
  { id: 'card_4', name: 'Cyber Hound', type: 'character', rarity: 'uncommon', attack: 12, defense: 8, estimatedValue: 5, imageUrl: 'https://firebasestorage.googleapis.com/v0/b/solgine-3a3c6.firebasestorage.app/o/cards%2Fcyber_hound.png?alt=media' },
  { id: 'card_5', name: 'Nova Guardian', type: 'character', rarity: 'rare', attack: 25, defense: 25, estimatedValue: 20, imageUrl: 'https://firebasestorage.googleapis.com/v0/b/solgine-3a3c6.firebasestorage.app/o/cards%2Fnova_guardian.png?alt=media' },
  { id: 'card_6', name: 'Plasma Aegis', type: 'spell', rarity: 'rare', attack: 0, defense: 30, estimatedValue: 20, imageUrl: 'https://firebasestorage.googleapis.com/v0/b/solgine-3a3c6.firebasestorage.app/o/cards%2Fplasma_aegis.png?alt=media' },
  { id: 'card_7', name: 'Void Walker', type: 'character', rarity: 'epic', attack: 40, defense: 15, estimatedValue: 100, imageUrl: 'https://firebasestorage.googleapis.com/v0/b/solgine-3a3c6.firebasestorage.app/o/cards%2Fvoid_walker.png?alt=media' },
  { id: 'card_8', name: 'Celestial Dragon', type: 'character', rarity: 'legendary', attack: 80, defense: 60, estimatedValue: 500, imageUrl: 'https://firebasestorage.googleapis.com/v0/b/solgine-3a3c6.firebasestorage.app/o/cards%2Fcelestial_dragon.png?alt=media' },
  { id: 'card_9', name: 'Omega Protocol', type: 'spell', rarity: 'mythic', attack: 0, defense: 0, ability: 'Destroy all cards', estimatedValue: 2000, imageUrl: 'https://firebasestorage.googleapis.com/v0/b/solgine-3a3c6.firebasestorage.app/o/cards%2Fomega_protocol.png?alt=media' },
];

export async function POST() {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const packsSnap = await adminDb.collection('boosterPacks').get();
    const batch = adminDb.batch();

    // Always re-seed or update if needed for this task to ensure 'solgine' DB has data
    for (const p of SEED_PACKS) {
      batch.set(adminDb.collection('boosterPacks').doc(p.id), p);
    }
    for (const c of SEED_CARDS) {
      batch.set(adminDb.collection('cards').doc(c.id), c);
    }
    
    await batch.commit();

    return NextResponse.json({ message: 'Seeded successfully into solgine database' });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
