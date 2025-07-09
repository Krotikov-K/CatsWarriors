import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SimpleAdminPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>({
    characters: [],
    users: [],
    locations: [],
    npcs: []
  });
  
  // Set authentication and fetch data
  useEffect(() => {
    console.log("SimpleAdminPanel: Setting up authentication...");
    
    // Always authenticate for Telegram WebApp
    localStorage.setItem("adminAuthenticated", "true");
    localStorage.setItem("adminTimestamp", Date.now().toString());
    
    // Fetch data manually
    const fetchData = async () => {
      try {
        const headers = {
          'Content-Type': 'application/json',
          'x-admin-password': '3138'
        };
        
        const [charactersRes, usersRes, locationsRes, npcsRes] = await Promise.all([
          fetch('/api/admin/characters', { headers }),
          fetch('/api/admin/users', { headers }),
          fetch('/api/locations'),
          fetch('/api/npcs')
        ]);
        
        const [characters, users, locationsData, npcsData] = await Promise.all([
          charactersRes.json(),
          usersRes.json(),
          locationsRes.json(),
          npcsRes.json()
        ]);
        
        setData({
          characters: characters || [],
          users: users || [],
          locations: locationsData.locations || [],
          npcs: npcsData.npcs || []
        });
        
        console.log("Data loaded:", {
          characters: characters?.length || 0,
          users: users?.length || 0,
          locations: locationsData.locations?.length || 0,
          npcs: npcsData.npcs?.length || 0
        });
        
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">
          <div className="text-lg">Загрузка админ-панели...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Админ-панель Cats War</h1>
        <p className="text-muted-foreground">Управление игровым миром</p>
      </div>

      <div className="grid gap-6">
        {/* Characters Section */}
        <Card>
          <CardHeader>
            <CardTitle>Персонажи ({data.characters.length})</CardTitle>
            <CardDescription>Управление персонажами игроков</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.characters.map((character: any) => (
                <div key={character.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">
                      {character.name} {character.gender === 'female' ? '🐈' : '🐱'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Уровень {character.level} • HP: {character.currentHp}/{character.maxHp}
                    </div>
                  </div>
                  <Badge variant={character.clan === 'thunder' ? 'default' : 'secondary'}>
                    {character.clan === 'thunder' ? 'Грозовое' : 'Речное'} Племя
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Users Section */}
        <Card>
          <CardHeader>
            <CardTitle>Пользователи ({data.users.length})</CardTitle>
            <CardDescription>Зарегистрированные игроки</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.users.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-muted rounded">
                  <div>
                    <div className="font-medium">{user.username}</div>
                    <div className="text-sm text-muted-foreground">ID: {user.id}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {user.telegramId ? `Telegram: ${user.telegramId}` : 'Без Telegram'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Locations Section */}
        <Card>
          <CardHeader>
            <CardTitle>Локации ({data.locations.length})</CardTitle>
            <CardDescription>Игровые локации</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {data.locations.map((location: any) => (
                <div key={location.id} className="p-3 bg-muted rounded">
                  <div className="font-medium">{location.emoji} {location.name}</div>
                  <div className="text-sm text-muted-foreground">{location.description}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* NPCs Section */}
        <Card>
          <CardHeader>
            <CardTitle>NPC ({data.npcs.length})</CardTitle>
            <CardDescription>Неигровые персонажи</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {data.npcs.map((npc: any) => (
                <div key={npc.id} className="p-3 bg-muted rounded">
                  <div className="font-medium">{npc.emoji} {npc.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Уровень {npc.level} • HP: {npc.currentHp}/{npc.maxHp}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}