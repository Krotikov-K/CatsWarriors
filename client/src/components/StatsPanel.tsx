import { type Character } from "@shared/schema";
import { calculateDerivedStats } from "@/lib/gameUtils";

interface StatsPanelProps {
  character: Character;
}

export default function StatsPanel({ character }: StatsPanelProps) {
  const derivedStats = calculateDerivedStats(character);

  return (
    <div className="p-4 border-b border-border">
      <h4 className="font-semibold mb-3 text-foreground">Характеристики</h4>
      
      {/* Primary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground mb-1">Сила</div>
          <div className="font-bold text-lg text-foreground">
            {character.strength}
          </div>
        </div>
        
        <div className="bg-card p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground mb-1">Ловкость</div>
          <div className="font-bold text-lg text-foreground">
            {character.agility}
          </div>
        </div>
        
        <div className="bg-card p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground mb-1">Интеллект</div>
          <div className="font-bold text-lg text-foreground">
            {character.intelligence}
          </div>
        </div>
        
        <div className="bg-card p-3 rounded-lg text-center">
          <div className="text-xs text-muted-foreground mb-1">Стойкость</div>
          <div className="font-bold text-lg text-foreground">
            {character.endurance}
          </div>
        </div>
      </div>

      {/* Derived Stats */}
      <div className="mt-4 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Урон:</span>
          <span className="font-bold text-foreground">
            {derivedStats.damage.min}-{derivedStats.damage.max}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Уворот:</span>
          <span className="font-bold text-foreground">
            {derivedStats.dodgeChance.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Блок:</span>
          <span className="font-bold text-foreground">
            {derivedStats.blockChance.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Крит. удар:</span>
          <span className="font-bold text-foreground">
            {derivedStats.critChance.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
