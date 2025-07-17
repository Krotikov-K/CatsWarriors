import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Shield, Heart, Leaf, Sword, BookOpen, Baby } from "lucide-react";
import RankManagement from "./RankManagement";
import ElderPromotionDialog from "./ElderPromotionDialog";
import type { Character } from "@shared/schema";

interface TribeManagementProps {
  character: Character;
}

const rankIcons = {
  leader: "👑",
  deputy: "⚔️", 
  senior_healer: "🌿",
  healer: "🍃",
  healer_apprentice: "🌱",
  senior_warrior: "⭐",
  warrior: "🗡️",
  apprentice: "🔰",
  kitten: "🐾"
};

const rankNames = {
  leader: "Предводитель",
  deputy: "Глашатай",
  senior_healer: "Старший целитель", 
  healer: "Целитель",
  healer_apprentice: "Ученик целителя",
  senior_warrior: "Старший воитель",
  warrior: "Воитель",
  apprentice: "Оруженосец",
  kitten: "Котёнок"
};

export default function TribeManagement({ character }: TribeManagementProps) {
  const canManageRanks = character.rank === "leader" || character.rank === "deputy" || character.rank === "senior_healer";
  const isKitten = character.rank === "kitten";

  return (
    <div className="space-y-4">
      {/* Character Rank Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Ваш ранг в племени
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{rankIcons[character.rank as keyof typeof rankIcons]}</span>
            <div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {rankNames[character.rank as keyof typeof rankNames]}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">
                {character.clan === "thunder" ? "Грозовое племя ⚡" : "Речное племя 🌊"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rank Management for Leaders */}
      {canManageRanks && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Управление рангами
            </CardTitle>
            <CardDescription>
              Назначайте ранги соплеменникам
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RankManagement character={character} />
          </CardContent>
        </Card>
      )}

      {/* Kitten Promotion */}
      {isKitten && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Baby className="h-5 w-5" />
              Церемония посвящения
            </CardTitle>
            <CardDescription>
              Готовы стать оруженосцем?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ElderPromotionDialog character={character} />
          </CardContent>
        </Card>
      )}

      {/* Tribe Hierarchy Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Иерархия племени
          </CardTitle>
          <CardDescription>
            Структура рангов в племени
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
              <span className="text-xl">👑</span>
              <span className="font-semibold">Предводитель</span>
              <span className="text-sm text-muted-foreground">- управляет всем племенем</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
              <span className="text-xl">⚔️</span>
              <span className="font-semibold">Глашатай</span>
              <span className="text-sm text-muted-foreground">- помощник предводителя</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
              <span className="text-xl">🌿</span>
              <span className="font-semibold">Старший целитель</span>
              <span className="text-sm text-muted-foreground">- главный лекарь племени</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
              <span className="text-xl">🗡️</span>
              <span className="font-semibold">Воители</span>
              <span className="text-sm text-muted-foreground">- защитники племени</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
              <span className="text-xl">🔰</span>
              <span className="font-semibold">Оруженосцы</span>
              <span className="text-sm text-muted-foreground">- ученики воителей</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-pink-50 dark:bg-pink-900/20 rounded">
              <span className="text-xl">🐾</span>
              <span className="font-semibold">Котята</span>
              <span className="text-sm text-muted-foreground">- будущие защитники племени</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}