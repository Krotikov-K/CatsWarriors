import { type Character, type DerivedStats } from "@shared/schema";

export function calculateDerivedStats(character: Character): DerivedStats {
  const { strength, agility, intelligence, endurance } = character;
  
  // Damage calculation: strength is primary factor
  const baseDamage = strength * 1.2;
  const damage = {
    min: Math.floor(baseDamage * 0.8),
    max: Math.floor(baseDamage * 1.3)
  };

  // Dodge chance: agility is primary factor (max 30%)
  const dodgeChance = Math.min(30, agility * 0.8);

  // Block chance: endurance contributes to defense (max 25%)
  const blockChance = Math.min(25, endurance * 0.6);

  // Critical hit chance: intelligence affects precision (max 20%)
  const critChance = Math.min(20, intelligence * 0.5);

  return {
    damage,
    dodgeChance,
    blockChance,
    critChance
  };
}

export function getClanColor(clan: string): string {
  const colors = {
    thunder: "text-green-400",
    shadow: "text-purple-400", 
    wind: "text-blue-400",
    river: "text-cyan-400"
  };
  return colors[clan as keyof typeof colors] || "text-gray-400";
}

export function getClanBorderColor(clan: string): string {
  const colors = {
    thunder: "border-green-500",
    shadow: "border-purple-500",
    wind: "border-blue-500", 
    river: "border-cyan-500"
  };
  return colors[clan as keyof typeof colors] || "border-gray-500";
}

export function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export function calculateLevelProgress(experience: number, level: number): number {
  // Experience needed for CURRENT level (not next level)
  const currentLevelExp = (level - 1) * 1000;  // Level 1 starts at 0 exp
  const nextLevelExp = level * 1000;           // Level 2 starts at 1000 exp
  
  // Progress within current level
  const progressInLevel = experience - currentLevelExp;
  const expForThisLevel = nextLevelExp - currentLevelExp;
  
  return Math.min(100, (progressInLevel / expForThisLevel) * 100);
}

export function getHealthColor(currentHp: number, maxHp: number): string {
  const percentage = (currentHp / maxHp) * 100;
  
  if (percentage > 60) return "bg-green-500";
  if (percentage > 30) return "bg-yellow-500";
  return "bg-red-500";
}

export function formatStatBonus(value: number): string {
  return value > 0 ? `+${value}` : value.toString();
}
