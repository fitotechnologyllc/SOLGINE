/**
 * Card Utilities for SOLGINE
 */

export type CardRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';

export const RARITY_BASE_VALUES: Record<string, number> = {
  common: 2,
  uncommon: 8,
  rare: 25,
  epic: 75,
  legendary: 250,
  mythic: 1000
};

/**
 * Get the best available image URL for a card with multiple possible field names.
 */
export function getCardImage(card: any): string {
  if (!card) return '';
  
  return (
    card.imageUrl || 
    card.artworkUrl || 
    card.cardImageUrl || 
    card.image || 
    ''
  );
}

/**
 * Calculate the estimated value of a card based on market data or rarity fallback.
 */
export function getCardEstimatedValue(card: any, valueIndex?: any): number {
  if (!card) return 0;
  
  // 1. Try Value Index (Average Sale)
  if (valueIndex?.averageSale) return valueIndex.averageSale;
  
  // 2. Try Value Index (Estimated Value Low)
  if (valueIndex?.estimatedValueLow) return valueIndex.estimatedValueLow;
  
  // 3. Try card's own estimatedValue field
  if (card.estimatedValue) return card.estimatedValue;
  
  // 4. Try card's valueIndex object (if it exists)
  if (card.valueIndex?.estimatedValue) return card.valueIndex.estimatedValue;
  
  // 5. Fallback to rarity base value
  const rarity = (card.rarity || 'Common').toLowerCase();
  return RARITY_BASE_VALUES[rarity] || 2;
}

/**
 * Get the rarity color for gradients and text
 */
export function getRarityColor(rarity: string): string {
  switch (rarity?.toLowerCase()) {
    case 'mythic': return '#ef4444'; // red-500
    case 'legendary': return '#fbbf24'; // amber-400
    case 'epic': return '#a855f7'; // purple-500
    case 'rare': return '#3b82f6'; // blue-500
    case 'uncommon': return '#10b981'; // emerald-500/secondary
    default: return '#71717a'; // zinc-500
  }
}
