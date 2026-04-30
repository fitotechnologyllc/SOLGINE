export interface UserStats {
  xp: number;
  level: number;
  battlesPlayed: number;
  battlesWon: number;
  battlesLost: number;
  winStreak: number;
  packsEarned: number;
  starterCredits: number;
  standardCredits: number;
  premiumCredits: number;
  eliteCredits: number;
}

export const XP_PER_LEVEL_BASE = 250;

/**
 * Calculates the level based on total XP
 * Formula: Level 1 (0 XP), Level 2 (250 XP), Level 3 (250 + 500 = 750 XP), etc.
 * Total XP for level L = 250 * L * (L-1) / 2
 */
export function calculateLevel(totalXp: number): number {
  let level = 1;
  while (totalXp >= (level * XP_PER_LEVEL_BASE)) {
    totalXp -= (level * XP_PER_LEVEL_BASE);
    level++;
  }
  return level;
}

/**
 * Returns the XP needed to progress from current level to next
 */
export function getXpForNextLevel(level: number): number {
  return level * XP_PER_LEVEL_BASE;
}

/**
 * Returns the XP progress within the current level
 */
export function getCurrentLevelProgress(totalXp: number): { currentXp: number, neededXp: number, percentage: number, level: number } {
  let level = 1;
  let remainingXp = totalXp;
  
  while (remainingXp >= (level * XP_PER_LEVEL_BASE)) {
    remainingXp -= (level * XP_PER_LEVEL_BASE);
    level++;
  }
  
  const needed = level * XP_PER_LEVEL_BASE;
  return {
    currentXp: remainingXp,
    neededXp: needed,
    percentage: (remainingXp / needed) * 100,
    level
  };
}

export function getLevelRewards(oldLevel: number, newLevel: number) {
  const rewards = {
    starter: 0,
    standard: 0,
    premium: 0,
    elite: 0
  };

  for (let l = oldLevel + 1; l <= newLevel; l++) {
    rewards.starter += 1;
    if (l % 5 === 0) rewards.standard += 1;
    if (l % 10 === 0) rewards.premium += 1;
    if (l === 25) rewards.elite += 1;
  }

  return rewards;
}
