import { useLocation } from "wouter";
import { useUser } from "@/hooks/useUser";
import { useGameState } from "@/hooks/useGameState";
import { Button } from "@/components/ui/button";

export default function GameDashboard() {
  const [, navigate] = useLocation();
  const { user, isLoading: userLoading } = useUser();
  const { gameState, isLoading: gameLoading, error } = useGameState(user?.id || null);

  if (userLoading || gameLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Cats War</h1>
          <p className="text-muted-foreground mb-6">
            Загружаем игру...
          </p>
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Ошибка</h1>
          <p className="text-red-500 mb-6">
            Не удалось загрузить игровые данные
          </p>
          <Button onClick={() => navigate("/create-character")}>
            Создать персонажа
          </Button>
        </div>
      </div>
    );
  }

  if (!gameState?.character) {
    navigate("/create-character");
    return null;
  }

  const character = gameState.character;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Cats War</h1>
        <div className="bg-card rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">{character.name}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {character.clan === 'thunder' ? 'Грозовое' : 'Речное'} племя
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Уровень</p>
              <p>{character.level}</p>
            </div>
            <div>
              <p className="font-medium">Опыт</p>
              <p>{character.experience}</p>
            </div>
            <div>
              <p className="font-medium">Здоровье</p>
              <p>{character.currentHp}/{character.maxHp}</p>
            </div>
            <div>
              <p className="font-medium">Сила</p>
              <p>{character.strength}</p>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground">
          Добро пожаловать в игру! Полный интерфейс в разработке.
        </p>
        <Button 
          onClick={() => navigate("/create-character")}
          variant="outline"
          className="mt-4"
        >
          Создать нового персонажа
        </Button>
      </div>
    </div>
  );
}