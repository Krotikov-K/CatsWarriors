import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function SimpleAdminPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>({
    characters: [],
    users: [],
    locations: [],
    npcs: []
  });
  const [editingCharacter, setEditingCharacter] = useState<any>(null);
  const [editingNPC, setEditingNPC] = useState<any>(null);
  const { toast } = useToast();
  
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

  // Helper function to make admin API calls
  const makeAdminRequest = async (endpoint: string, method: string = 'GET', body?: any) => {
    const headers = {
      'Content-Type': 'application/json',
      'x-admin-password': '3138'
    };
    
    const response = await fetch(endpoint, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  };

  // Character management functions
  const updateCharacter = async (characterId: number, updates: any) => {
    try {
      await makeAdminRequest(`/api/admin/characters/${characterId}`, 'PATCH', updates);
      toast({ title: "Персонаж обновлен!", description: "Изменения сохранены" });
      
      // Reload data
      const characters = await makeAdminRequest('/api/admin/characters');
      setData(prev => ({ ...prev, characters }));
      setEditingCharacter(null);
    } catch (error) {
      console.error('Error updating character:', error);
      toast({ title: "Ошибка", description: "Не удалось обновить персонажа", variant: "destructive" });
    }
  };

  // NPC management functions
  const respawnNPC = async (npcId: number) => {
    try {
      await makeAdminRequest(`/api/admin/npcs/${npcId}/respawn`, 'POST');
      toast({ title: "NPC возрожден!", description: "NPC снова готов к бою" });
      
      // Reload NPCs
      const npcsData = await fetch('/api/npcs').then(res => res.json());
      setData(prev => ({ ...prev, npcs: npcsData.npcs }));
    } catch (error) {
      console.error('Error respawning NPC:', error);
      toast({ title: "Ошибка", description: "Не удалось возродить NPC", variant: "destructive" });
    }
  };

  const updateNPC = async (npcId: number, updates: any) => {
    try {
      await makeAdminRequest(`/api/admin/npcs/${npcId}`, 'PATCH', updates);
      toast({ title: "NPC обновлен!", description: "Изменения сохранены" });
      
      // Reload NPCs
      const npcsData = await fetch('/api/npcs').then(res => res.json());
      setData(prev => ({ ...prev, npcs: npcsData.npcs }));
      setEditingNPC(null);
    } catch (error) {
      console.error('Error updating NPC:', error);
      toast({ title: "Ошибка", description: "Не удалось обновить NPC", variant: "destructive" });
    }
  };

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

      <Tabs defaultValue="characters" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="characters">Персонажи</TabsTrigger>
          <TabsTrigger value="npcs">NPC</TabsTrigger>
          <TabsTrigger value="locations">Локации</TabsTrigger>
          <TabsTrigger value="users">Пользователи</TabsTrigger>
        </TabsList>

        <TabsContent value="characters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Персонажи ({data.characters.length})</CardTitle>
              <CardDescription>Управление персонажами игроков</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.characters.map((character: any) => (
                  <div key={character.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">
                        {character.name} {character.gender === 'female' ? '🐈' : '🐱'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ID: {character.id} • Уровень {character.level} • HP: {character.currentHp}/{character.maxHp}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Сила: {character.strength} • Ловкость: {character.agility} • Интеллект: {character.intelligence} • Выносливость: {character.endurance}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={character.clan === 'thunder' ? 'default' : 'secondary'}>
                        {character.clan === 'thunder' ? 'Грозовое' : 'Речное'} Племя
                      </Badge>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Редактировать
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Редактирование персонажа {character.name}</DialogTitle>
                          </DialogHeader>
                          <CharacterEditForm 
                            character={character} 
                            onUpdate={updateCharacter}
                            onCancel={() => setEditingCharacter(null)}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="npcs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>NPC ({data.npcs.length})</CardTitle>
              <CardDescription>Управление неигровыми персонажами</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.npcs.map((npc: any) => (
                  <div key={npc.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{npc.emoji} {npc.name}</div>
                      <div className="text-sm text-muted-foreground">
                        ID: {npc.id} • Уровень {npc.level} • HP: {npc.currentHp}/{npc.maxHp}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Локация: {npc.locationId} • Тип: {npc.type}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={npc.isDead ? 'destructive' : 'default'}>
                        {npc.isDead ? 'Мертв' : 'Живой'}
                      </Badge>
                      {npc.isDead && (
                        <Button variant="outline" size="sm" onClick={() => respawnNPC(npc.id)}>
                          Возродить
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Редактировать
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Редактирование NPC {npc.name}</DialogTitle>
                          </DialogHeader>
                          <NPCEditForm 
                            npc={npc} 
                            onUpdate={updateNPC}
                            onCancel={() => setEditingNPC(null)}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Локации ({data.locations.length})</CardTitle>
              <CardDescription>Игровые локации</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.locations.map((location: any) => (
                  <div key={location.id} className="p-4 bg-muted rounded-lg">
                    <div className="font-medium">{location.emoji} {location.name}</div>
                    <div className="text-sm text-muted-foreground">{location.description}</div>
                    <div className="text-sm text-muted-foreground">
                      ID: {location.id} • Координаты: ({location.x}, {location.y})
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Пользователи ({data.users.length})</CardTitle>
              <CardDescription>Зарегистрированные игроки</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.users.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm text-muted-foreground">
                        ID: {user.id} • {user.telegramId ? `Telegram: ${user.telegramId}` : 'Без Telegram'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Character Edit Form Component
function CharacterEditForm({ character, onUpdate, onCancel }: any) {
  const [formData, setFormData] = useState({
    name: character.name,
    level: character.level,
    currentHp: character.currentHp,
    maxHp: character.maxHp,
    strength: character.strength,
    agility: character.agility,
    intelligence: character.intelligence,
    endurance: character.endurance,
    clan: character.clan,
    locationId: character.locationId
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(character.id, formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Имя</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="level">Уровень</Label>
          <Input
            id="level"
            type="number"
            value={formData.level}
            onChange={(e) => setFormData(prev => ({ ...prev, level: parseInt(e.target.value) }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="currentHp">Текущее HP</Label>
          <Input
            id="currentHp"
            type="number"
            value={formData.currentHp}
            onChange={(e) => setFormData(prev => ({ ...prev, currentHp: parseInt(e.target.value) }))}
          />
        </div>
        <div>
          <Label htmlFor="maxHp">Максимальное HP</Label>
          <Input
            id="maxHp"
            type="number"
            value={formData.maxHp}
            onChange={(e) => setFormData(prev => ({ ...prev, maxHp: parseInt(e.target.value) }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="strength">Сила</Label>
          <Input
            id="strength"
            type="number"
            value={formData.strength}
            onChange={(e) => setFormData(prev => ({ ...prev, strength: parseInt(e.target.value) }))}
          />
        </div>
        <div>
          <Label htmlFor="agility">Ловкость</Label>
          <Input
            id="agility"
            type="number"
            value={formData.agility}
            onChange={(e) => setFormData(prev => ({ ...prev, agility: parseInt(e.target.value) }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="intelligence">Интеллект</Label>
          <Input
            id="intelligence"
            type="number"
            value={formData.intelligence}
            onChange={(e) => setFormData(prev => ({ ...prev, intelligence: parseInt(e.target.value) }))}
          />
        </div>
        <div>
          <Label htmlFor="endurance">Выносливость</Label>
          <Input
            id="endurance"
            type="number"
            value={formData.endurance}
            onChange={(e) => setFormData(prev => ({ ...prev, endurance: parseInt(e.target.value) }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="clan">Клан</Label>
          <Select value={formData.clan} onValueChange={(value) => setFormData(prev => ({ ...prev, clan: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thunder">Грозовое Племя</SelectItem>
              <SelectItem value="river">Речное Племя</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="locationId">Локация ID</Label>
          <Input
            id="locationId"
            type="number"
            value={formData.locationId}
            onChange={(e) => setFormData(prev => ({ ...prev, locationId: parseInt(e.target.value) }))}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit">
          Сохранить
        </Button>
      </div>
    </form>
  );
}

// NPC Edit Form Component
function NPCEditForm({ npc, onUpdate, onCancel }: any) {
  const [formData, setFormData] = useState({
    name: npc.name,
    level: npc.level,
    currentHp: npc.currentHp,
    maxHp: npc.maxHp,
    strength: npc.strength,
    agility: npc.agility,
    intelligence: npc.intelligence,
    endurance: npc.endurance,
    locationId: npc.locationId
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(npc.id, formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="npc-name">Имя</Label>
          <Input
            id="npc-name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="npc-level">Уровень</Label>
          <Input
            id="npc-level"
            type="number"
            value={formData.level}
            onChange={(e) => setFormData(prev => ({ ...prev, level: parseInt(e.target.value) }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="npc-currentHp">Текущее HP</Label>
          <Input
            id="npc-currentHp"
            type="number"
            value={formData.currentHp}
            onChange={(e) => setFormData(prev => ({ ...prev, currentHp: parseInt(e.target.value) }))}
          />
        </div>
        <div>
          <Label htmlFor="npc-maxHp">Максимальное HP</Label>
          <Input
            id="npc-maxHp"
            type="number"
            value={formData.maxHp}
            onChange={(e) => setFormData(prev => ({ ...prev, maxHp: parseInt(e.target.value) }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="npc-strength">Сила</Label>
          <Input
            id="npc-strength"
            type="number"
            value={formData.strength}
            onChange={(e) => setFormData(prev => ({ ...prev, strength: parseInt(e.target.value) }))}
          />
        </div>
        <div>
          <Label htmlFor="npc-agility">Ловкость</Label>
          <Input
            id="npc-agility"
            type="number"
            value={formData.agility}
            onChange={(e) => setFormData(prev => ({ ...prev, agility: parseInt(e.target.value) }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="npc-intelligence">Интеллект</Label>
          <Input
            id="npc-intelligence"
            type="number"
            value={formData.intelligence}
            onChange={(e) => setFormData(prev => ({ ...prev, intelligence: parseInt(e.target.value) }))}
          />
        </div>
        <div>
          <Label htmlFor="npc-endurance">Выносливость</Label>
          <Input
            id="npc-endurance"
            type="number"
            value={formData.endurance}
            onChange={(e) => setFormData(prev => ({ ...prev, endurance: parseInt(e.target.value) }))}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="npc-locationId">Локация ID</Label>
        <Input
          id="npc-locationId"
          type="number"
          value={formData.locationId}
          onChange={(e) => setFormData(prev => ({ ...prev, locationId: parseInt(e.target.value) }))}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit">
          Сохранить
        </Button>
      </div>
    </form>
  );
}