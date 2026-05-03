export type UserRole = 'player' | 'projectOwner' | 'admin' | 'owner';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  walletAddress?: string;
  balance: number;
  stats: {
    packsOpened: number;
    matchesWon: number;
    matchesLost: number;
  };
  createdAt: any;
}

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  status: 'draft' | 'live';
  settings: {
    hp: number;
    deckSize: number;
    turnRules: string;
  };
  createdAt: any;
}

export interface Card {
  id: string;
  projectId: string;
  name: string;
  description: string;
  image: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  type: string;
  stats: {
    atk: number;
    def: number;
  };
  ability: {
    name: string;
    description: string;
  };
  valueIndex: {
    estimatedValue: number;
    lastSale: number;
    supply: number;
  };
  createdAt: any;
}

export interface BoosterPack {
  id: string;
  projectId: string;
  name: string;
  price: number;
  rarityOdds: Record<string, number>;
  supplyLimit: number;
  remainingSupply: number;
  createdAt: any;
}

export interface PackOpening {
  id: string;
  userId: string;
  packId: string;
  results: string[]; // Card IDs
  openedAt: any;
}

export interface PlayerCollection {
  userId: string;
  cards: {
    cardId: string;
    count: number;
    acquiredAt: any;
  }[];
}

export interface Deck {
  id: string;
  userId: string;
  name: string;
  cardIds: string[];
  createdAt: any;
}

export interface Match {
  id: string;
  player1Id: string;
  player2Id?: string;
  status: 'searching' | 'active' | 'finished';
  state: any;
  winnerId?: string;
  createdAt: any;
}

export interface MarketListing {
  id: string;
  sellerId: string;
  cardId: string;
  price: number;
  status: 'active' | 'sold' | 'cancelled';
  createdAt: any;
}

export interface Trade {
  id: string;
  senderId: string;
  receiverId: string;
  offer: {
    cards: string[];
    sol: number;
  };
  request: {
    cards: string[];
    sol: number;
  };
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'purchase' | 'sale' | 'trade';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: any;
}

export interface AIConversation {
  id: string;
  userId: string;
  mode: 'builder' | 'player' | 'developer' | 'admin';
  createdAt: any;
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: any;
}
