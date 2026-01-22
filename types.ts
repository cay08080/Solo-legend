
export enum CharacterClass {
  WARRIOR = 'Guerreiro',
  MAGE = 'Mago',
  ROGUE = 'Ladino',
  CLERIC = 'Clérigo'
}

export enum Rarity {
  COMMON = 'Comum',
  RARE = 'Raro',
  EPIC = 'Épico',
  LEGENDARY = 'Lendário',
  MYTHIC = 'Mítico',
  ARTIFACT = 'Artefato'
}

export interface Enemy {
  name: string;
  currentHp: number;
  maxHp: number;
  imageUrl?: string;
  description: string;
  level: number;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: 'consumable' | 'weapon' | 'armor' | 'accessory' | 'tool' | 'misc';
  rarity: Rarity;
  effect?: string;
  imageUrl?: string;
  classRequirement?: CharacterClass | string;
}

export interface Equipment {
  weapon: Item | null;
  armor: Item | null;
  accessory: Item | null;
}

export interface Skill {
  name: string;
  description: string;
  cost: number; 
  effect_type: 'damage' | 'heal' | 'utility' | 'buff';
  cooldown: number; 
  flavor_text?: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'failed';
  difficulty: number;
}

export interface World {
  id: string;
  name: string;
  description: string;
  theme: string;
  createdAt: number;
}

export interface Character {
  name: string;
  class: CharacterClass;
  race: string;
  gender: string;
  appearance: string;
  backstory: string;
  blessingName?: string;
  blessingDescription?: string;
  portraitUrl?: string;
  level: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  xp: number;
  manaCoins: number;
  attributePoints: number; 
  inventory: Item[];
  equipment: Equipment; 
  skills: Skill[]; 
  quests: Quest[]; 
  proficiencies: string[];
  attributes: {
    strength: number;
    dexterity: number;
    intelligence: number;
    wisdom: number;
  };
}

export interface GameState {
  locationName: string;
  isCombat: boolean;
  currentEnemy: Enemy | null;
  lastTurnSummary: string;
  worldContext: string;
}

export interface GameSave {
  id: string;
  world: World;
  character: Character;
  messages: ChatMessage[];
  gameState: GameState;
  lastPlayed: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'dm' | 'system';
  content: string;
  imageUrl?: string;
  avatarUrl?: string;
}

export interface DMResponse {
  narrative: string;
  visual_description: string;
  hp_change: number;
  mp_change: number; 
  xp_change: number;
  mana_coin_change: number;
  inventory_add?: Item[];
  inventory_remove?: string[];
  location_update?: string | null;
  is_combat: boolean;
  enemy_update?: Enemy | null;
  suggested_actions: string[];
  world_context_update: string;
}

export interface SkillForgeResponse {
  skill: Skill;
  mana_coin_cost: number;
  is_approved: boolean;
  refusal_reason?: string;
}
