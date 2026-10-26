export type Difficulty = 'facile' | 'medio' | 'difficile';
export type Phase = 'SETUP_PLACEMENT' | 'TRIS_EXCHANGE' | 'REINFORCEMENT' | 'ATTACK' | 'POST_CONQUEST_MOVE' | 'FORTIFY' | 'CARD_DRAW' | 'SDADATA_CHECK' | 'GAME_OVER';
export type Player = {
  id: number;
  name: string;
  color: string;
  human: boolean;
  difficulty: Difficulty;
  blind: boolean;
  objective: number;
  cards: number[];
  setupRemaining: number;
  eliminated: boolean;
};
export type BoardCell = {
  owner: number;
  armies: number;
};
export type PendingMove = {
  from: number;
  to: number;
  min: number;
};
export type GameEvent = {
  type: 'onGameStateUpdate' | 'onDiceRolled' | 'onTurnChanged' | 'onSdadataRoll' | 'onGameOver';
  player: number;
  message: string;
  territory?: number;
  action?: 'reinforce' | 'conquer' | 'move' | 'draw' | 'exchange';
  from?: number;
  to?: number;
  count?: number;
  defender?: number;
  attack?: number[];
  defense?: number[];
  losses?: number[];
};
export type GameState = {
  version: 1;
  id: string;
  revision: number;
  rng: number;
  aiRng: number;
  players: Player[];
  order: number[];
  active: number;
  round: number;
  phase: Phase;
  board: BoardCell[];
  deck: number[];
  discard: number[];
  reinforcements: number;
  setupBatch: number;
  conquests: number;
  pending: PendingMove | null;
  lastBattle: GameEvent | null;
  lastSdadata: GameEvent | null;
  sdadata: {
    started: boolean;
    anchor: number;
    threshold: number;
  } | null;
  turnSeconds: number;
  remainingMs: number;
  elapsedMs: number;
  paused: boolean;
  reason: 'risiko' | 'sdadata' | null;
  winner: number | null;
  log: GameEvent[];
  beliefs: Record<string, number[]>;
  lastCommandId: string | null;
  botContexts?: Record<number, BotContext>;
};
export type BotContext = {
  temperament: number;
  round: number;
  turns: number;
  lastEpisode: number;
  previousArmies: number;
  cautious: boolean;
  lostTerritory: number | null;
  reclaimUntil?: number;
  logIndex: number;
  episode: { from: number; to: number; initialArmies: number; rolls: number } | null;
};
export type GameConfig = {
  players: number;
  name: string;
  difficulties: (Difficulty | 'casuale')[];
  turnSeconds: number;
  seed?: number;
};
export type Command = {
  type: 'PLACE';
  territory: number;
  count: number;
} | {
  type: 'EXCHANGE';
  cards: number[];
} | {
  type: 'NEXT';
} | {
  type: 'ATTACK';
  from: number;
  to: number;
} | {
  type: 'MOVE';
  from: number;
  to: number;
  count: number;
} | {
  type: 'TIMEOUT';
};
export type PublicPlayer = Omit<Player, 'difficulty' | 'objective' | 'cards' | 'setupRemaining'> & {
  setupRemaining: number;
  difficulty: Difficulty | '?';
  objective?: number;
  cards?: number[];
  cardCount: number;
  totalArmies: number;
  territoryCount: number;
  nextReinforcements: number;
  points?: number;
  outside?: number;
};
export type GameView = Omit<GameState, 'rng' | 'aiRng' | 'deck' | 'discard' | 'beliefs' | 'players' | 'lastCommandId' | 'botContexts'> & {
  players: PublicPlayer[];
  deckCount: number;
  viewer: number;
};
