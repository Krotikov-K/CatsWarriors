import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Zap, Heart, Shield, Sword, Plus, Minus } from "lucide-react";

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: (statBoosts?: { strength: number; agility: number; intelligence: number; endurance: number }) => void;
  characterName: string;
  newLevel: number;
  baseStats: {
    strength: number;
    agility: number;
    intelligence: number;
    endurance: number;
    maxHp: number;
  };
}

export function LevelUpModal({ 
  isOpen, 
  onClose, 
  characterName, 
  newLevel,
  baseStats
}: LevelUpModalProps) {
  const [step, setStep] = useState<'celebration' | 'distribution' | 'confirmation'>('celebration');
  const [statBoosts, setStatBoosts] = useState({
    strength: 0,
    agility: 0,
    intelligence: 0,
    endurance: 0
  });

  const pointsToDistribute = 5;
  const usedPoints = Object.values(statBoosts).reduce((sum, val) => sum + val, 0);
  const remainingPoints = pointsToDistribute - usedPoints;

  const adjustStat = (stat: keyof typeof statBoosts, change: number) => {
    const newValue = statBoosts[stat] + change;
    if (newValue >= 0 && usedPoints + change <= pointsToDistribute) {
      setStatBoosts(prev => ({ ...prev, [stat]: newValue }));
    }
  };

  const calculateMaxHp = (endurance: number) => {
    return 80 + (endurance * 2);
  };

  const finalStats = {
    strength: baseStats.strength + statBoosts.strength,
    agility: baseStats.agility + statBoosts.agility,
    intelligence: baseStats.intelligence + statBoosts.intelligence,
    endurance: baseStats.endurance + statBoosts.endurance,
    maxHp: calculateMaxHp(baseStats.endurance + statBoosts.endurance)
  };

  const handleContinue = () => {
    if (step === 'celebration') {
      setStep('distribution');
    } else if (step === 'distribution') {
      if (remainingPoints === 0) {
        setStep('confirmation');
      }
    } else {
      onClose(statBoosts);
    }
  };

  const handleBack = () => {
    if (step === 'confirmation') {
      setStep('distribution');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Sparkles className="w-16 h-16 text-amber-500 animate-pulse" />
              <TrendingUp className="w-8 h-8 text-amber-600 absolute -top-2 -right-2 animate-bounce" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold text-amber-700 dark:text-amber-300">
            Повышение уровня!
          </DialogTitle>
        </DialogHeader>

        <div className="text-center space-y-4">
          {step === 'celebration' && (
            <>
              <div className="space-y-2">
                <p className="text-lg text-muted-foreground">
                  <span className="font-semibold text-foreground">{characterName}</span> достиг нового уровня!
                </p>
                <div className="flex justify-center">
                  <Badge variant="secondary" className="text-2xl px-4 py-2 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700">
                    Уровень {newLevel}
                  </Badge>
                </div>
              </div>
              
              <div className="bg-amber-100/50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  🎉 Вы получили 5 очков характеристик для распределения!
                </p>
              </div>
            </>
          )}

          {step === 'distribution' && (
            <>
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-300 mb-2">
                    Распределение характеристик
                  </h3>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    Осталось очков: {remainingPoints}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {/* Strength */}
                  <div className="bg-white/70 dark:bg-gray-800/70 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sword className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium">Сила</span>
                        <span className="text-xs text-muted-foreground">
                          ({baseStats.strength} → {finalStats.strength})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-8 h-8 p-0"
                          onClick={() => adjustStat('strength', -1)}
                          disabled={statBoosts.strength === 0}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-bold">{statBoosts.strength}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-8 h-8 p-0"
                          onClick={() => adjustStat('strength', 1)}
                          disabled={remainingPoints === 0}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Agility */}
                  <div className="bg-white/70 dark:bg-gray-800/70 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">Ловкость</span>
                        <span className="text-xs text-muted-foreground">
                          ({baseStats.agility} → {finalStats.agility})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-8 h-8 p-0"
                          onClick={() => adjustStat('agility', -1)}
                          disabled={statBoosts.agility === 0}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-bold">{statBoosts.agility}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-8 h-8 p-0"
                          onClick={() => adjustStat('agility', 1)}
                          disabled={remainingPoints === 0}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Intelligence */}
                  <div className="bg-white/70 dark:bg-gray-800/70 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-medium">Интеллект</span>
                        <span className="text-xs text-muted-foreground">
                          ({baseStats.intelligence} → {finalStats.intelligence})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-8 h-8 p-0"
                          onClick={() => adjustStat('intelligence', -1)}
                          disabled={statBoosts.intelligence === 0}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-bold">{statBoosts.intelligence}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-8 h-8 p-0"
                          onClick={() => adjustStat('intelligence', 1)}
                          disabled={remainingPoints === 0}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Endurance */}
                  <div className="bg-white/70 dark:bg-gray-800/70 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium">Выносливость</span>
                        <span className="text-xs text-muted-foreground">
                          ({baseStats.endurance} → {finalStats.endurance})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-8 h-8 p-0"
                          onClick={() => adjustStat('endurance', -1)}
                          disabled={statBoosts.endurance === 0}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-bold">{statBoosts.endurance}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-8 h-8 p-0"
                          onClick={() => adjustStat('endurance', 1)}
                          disabled={remainingPoints === 0}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {statBoosts.endurance > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-center gap-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span className="text-xs">Макс. здоровье: {baseStats.maxHp} → {finalStats.maxHp}</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 'confirmation' && (
            <>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-300">
                  Подтверждение изменений
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/70 dark:bg-gray-800/70 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Sword className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium">Сила</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{finalStats.strength}</span>
                      {statBoosts.strength > 0 && (
                        <span className="text-green-600 text-sm font-medium">
                          +{statBoosts.strength}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white/70 dark:bg-gray-800/70 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">Ловкость</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{finalStats.agility}</span>
                      {statBoosts.agility > 0 && (
                        <span className="text-green-600 text-sm font-medium">
                          +{statBoosts.agility}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white/70 dark:bg-gray-800/70 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium">Интеллект</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{finalStats.intelligence}</span>
                      {statBoosts.intelligence > 0 && (
                        <span className="text-green-600 text-sm font-medium">
                          +{statBoosts.intelligence}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white/70 dark:bg-gray-800/70 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">Выносливость</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{finalStats.endurance}</span>
                      {statBoosts.endurance > 0 && (
                        <span className="text-green-600 text-sm font-medium">
                          +{statBoosts.endurance}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {statBoosts.endurance > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-center gap-2">
                      <Heart className="w-5 h-5 text-red-500" />
                      <span className="text-sm font-medium">Максимальное здоровье</span>
                      <span className="text-lg font-bold">{finalStats.maxHp}</span>
                      <span className="text-green-600 text-sm font-medium">
                        +{finalStats.maxHp - baseStats.maxHp}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex gap-2">
            {step === 'confirmation' && (
              <Button 
                onClick={handleBack}
                variant="outline"
                className="flex-1"
              >
                Назад
              </Button>
            )}
            <Button 
              onClick={handleContinue}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3"
              disabled={step === 'distribution' && remainingPoints > 0}
            >
              {step === 'celebration' && "Распределить очки"}
              {step === 'distribution' && (remainingPoints > 0 ? `Осталось ${remainingPoints} очков` : "Подтвердить")}
              {step === 'confirmation' && "Применить изменения"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}