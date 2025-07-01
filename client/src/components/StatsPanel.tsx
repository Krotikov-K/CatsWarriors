import { type Character } from "@shared/schema";
import { calculateDerivedStats } from "@/lib/gameUtils";

interface StatsPanelProps {
  character: Character;
}

export default function StatsPanel({ character }: StatsPanelProps) {
  const derivedStats = calculateDerivedStats(character);

  return (
    <div className="p-4 border-b border-border-dark">
      <h4 className="font-gaming font-semibold mb-3 text-forest">Характеристики</h4>
      
      {/* Primary Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <i className="fas fa-fist-raised text-red-400 mb-1"></i>
          <div className="text-xs text-gray-400">Сила</div>
          <div className="font-stats font-bold text-lg text-white">
            {character.strength}
          </div>
        </div>
        
        <div className="stat-card">
          <i className="fas fa-running text-green-400 mb-1"></i>
          <div className="text-xs text-gray-400">Ловкость</div>
          <div className="font-stats font-bold text-lg text-white">
            {character.agility}
          </div>
        </div>
        
        <div className="stat-card">
          <i className="fas fa-brain text-blue-400 mb-1"></i>
          <div className="text-xs text-gray-400">Интеллект</div>
          <div className="font-stats font-bold text-lg text-white">
            {character.intelligence}
          </div>
        </div>
        
        <div className="stat-card">
          <i className="fas fa-shield-alt text-yellow-400 mb-1"></i>
          <div className="text-xs text-gray-400">Стойкость</div>
          <div className="font-stats font-bold text-lg text-white">
            {character.endurance}
          </div>
        </div>
      </div>

      {/* Derived Stats */}
      <div className="mt-4 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-400">Урон:</span>
          <span className="font-stats text-red-300">
            {derivedStats.damage.min}-{derivedStats.damage.max}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Уворот:</span>
          <span className="font-stats text-green-300">
            {derivedStats.dodgeChance.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Блок:</span>
          <span className="font-stats text-yellow-300">
            {derivedStats.blockChance.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Крит. удар:</span>
          <span className="font-stats text-purple-300">
            {derivedStats.critChance.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
