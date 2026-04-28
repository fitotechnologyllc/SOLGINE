import { NextResponse } from 'next/server';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const SEED_PACKS = [
  { id: 'pack_starter', name: 'Starter Pack', description: 'Begin your journey.', price: 10, cardsPerPack: 3, status: 'active', rarityOdds: { common: 65, uncommon: 20, rare: 10, epic: 4, legendary: 0.9, mythic: 0.1 }, visualStyle: 'teal' },
  { id: 'pack_standard', name: 'Standard Pack', description: 'A solid addition.', price: 50, cardsPerPack: 5, status: 'active', rarityOdds: { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 0.9, mythic: 0.1 }, visualStyle: 'blue' },
  { id: 'pack_premium', name: 'Premium Pack', description: 'High-end assets.', price: 250, cardsPerPack: 7, status: 'active', rarityOdds: { common: 20, uncommon: 30, rare: 30, epic: 15, legendary: 4, mythic: 1 }, visualStyle: 'purple' },
  { id: 'pack_elite', name: 'Elite Pack', description: 'For the veterans.', price: 1000, cardsPerPack: 10, status: 'active', rarityOdds: { common: 0, uncommon: 10, rare: 40, epic: 30, legendary: 15, mythic: 5 }, visualStyle: 'red' },
];

const SEED_CARDS = [
  { id: 'card_1', name: 'Pulse Reaper', type: 'character', rarity: 'common', attack: 10, defense: 5, estimatedValue: 1 },
  { id: 'card_2', name: 'Iron Phalanx', type: 'character', rarity: 'common', attack: 5, defense: 15, estimatedValue: 1 },
  { id: 'card_3', name: 'Neon Strider', type: 'character', rarity: 'uncommon', attack: 15, defense: 10, estimatedValue: 5 },
  { id: 'card_4', name: 'Cyber Hound', type: 'character', rarity: 'uncommon', attack: 12, defense: 8, estimatedValue: 5 },
  { id: 'card_5', name: 'Nova Guardian', type: 'character', rarity: 'rare', attack: 25, defense: 25, estimatedValue: 20 },
  { id: 'card_6', name: 'Plasma Aegis', type: 'spell', rarity: 'rare', attack: 0, defense: 30, estimatedValue: 20 },
  { id: 'card_7', name: 'Void Walker', type: 'character', rarity: 'epic', attack: 40, defense: 15, estimatedValue: 100 },
  { id: 'card_8', name: 'Celestial Dragon', type: 'character', rarity: 'legendary', attack: 80, defense: 60, estimatedValue: 500 },
  { id: 'card_9', name: 'Omega Protocol', type: 'spell', rarity: 'mythic', attack: 0, defense: 0, ability: 'Destroy all cards', estimatedValue: 2000 },
];

export async function POST() {
  try {
    const packsSnap = await getDocs(collection(db, 'boosterPacks'));
    if (!packsSnap.empty) {
      return NextResponse.json({ message: 'Already seeded' });
    }

    const batch = writeBatch(db);
    for (const p of SEED_PACKS) {
      batch.set(doc(db, 'boosterPacks', p.id), p);
    }
    for (const c of SEED_CARDS) {
      batch.set(doc(db, 'cards', c.id), c);
    }
    await batch.commit();

    return NextResponse.json({ message: 'Seeded successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
