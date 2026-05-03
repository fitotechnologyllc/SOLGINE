/**
 * Card Media & Art Utilities for SOLGINE
 */

import { getRarityColor } from './card-utils';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Normalizes the image field across different data shapes.
 */
export function getCardImage(card: any): string | null {
  if (!card) return null;
  
  return (
    card.imageUrl || 
    card.artworkUrl || 
    card.cardImageUrl || 
    card.image || 
    card.metadata?.image ||
    card.metadataUriImage ||
    null
  );
}

/**
 * Returns visual fallback properties based on card rarity and name.
 */
export function getCardImageFallback(card: any) {
  const rarity = (card.rarity || 'Common').toLowerCase();
  const name = card.name || 'Unknown Entity';
  
  // Default gradients based on rarity if no custom one exists
  const defaultGradients: Record<string, string> = {
    common: "from-zinc-900 via-slate-800 to-zinc-950",
    uncommon: "from-emerald-950 via-teal-900 to-black",
    rare: "from-blue-950 via-indigo-900 to-black",
    epic: "from-purple-950 via-indigo-900 to-black",
    legendary: "from-amber-950 via-yellow-900 to-black",
    mythic: "from-red-950 via-purple-900 to-black"
  };

  const visualGradient = card.visualGradient || defaultGradients[rarity] || defaultGradients.common;
  const color = getRarityColor(rarity);
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return {
    visualGradient,
    color,
    initials,
    rarityLabel: rarity.toUpperCase()
  };
}

/**
 * Hydrates owned cards with full metadata from the cards collection.
 */
export async function hydrateOwnedCards(userCollectionCards: any[]): Promise<any[]> {
  if (!userCollectionCards || userCollectionCards.length === 0) return [];

  const promises = userCollectionCards.map(async (ownedCard) => {
    if (!ownedCard.cardId) return null;
    
    try {
      const cardRef = doc(db, 'cards', ownedCard.cardId);
      const cardSnap = await getDoc(cardRef);
      
      if (!cardSnap.exists()) return null;
      
      const cardData = cardSnap.data();
      
      return {
        ...cardData,
        id: ownedCard.cardId,
        cardId: ownedCard.cardId,
        count: ownedCard.count || 1,
        listedCount: ownedCard.listedCount || 0,
        mintedCount: ownedCard.mintedCount || 0,
        // Ensure all required fields are present
        name: cardData.name || 'Unknown',
        rarity: cardData.rarity || 'Common',
        attack: cardData.attack || 0,
        defense: cardData.defense || 0,
        ability: cardData.ability || cardData.description || '',
        estimatedValue: cardData.estimatedValue || 0,
        imageUrl: cardData.imageUrl || null,
        artworkUrl: cardData.artworkUrl || null,
        cardImageUrl: cardData.cardImageUrl || null,
        visualGradient: cardData.visualGradient || null
      };
    } catch (e) {
      console.error(`Error hydrating card ${ownedCard.cardId}:`, e);
      return null;
    }
  });

  const results = await Promise.all(promises);
  return results.filter((c): c is any => c !== null);
}
