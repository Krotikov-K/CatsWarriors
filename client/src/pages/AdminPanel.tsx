import { useState, useEffect } from "react";
import { navigate } from "wouter/use-browser-location";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Character, Location, NPC, User } from "@shared/schema";

export default function AdminPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check admin authentication
  useEffect(() => {
    const isAuthenticated = localStorage.getItem("adminAuthenticated");
    const timestamp = localStorage.getItem("adminTimestamp");
    
    if (!isAuthenticated || !timestamp) {
      navigate("/admin-login");
      return;
    }

    // Check if session expired (30 minutes)
    const sessionAge = Date.now() - parseInt(timestamp);
    if (sessionAge > 30 * 60 * 1000) {
      localStorage.removeItem("adminAuthenticated");
      localStorage.removeItem("adminTimestamp");
      navigate("/admin-login");
      return;
    }
  }, []);
  
  // Fetch all data
  const { data: characters = [] } = useQuery<Character[]>({
    queryKey: ['/api/admin/characters'],
  });
  
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });
  
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });
  
  const { data: npcs = [] } = useQuery<NPC[]>({
    queryKey: ['/api/npcs'],
  });

  // Character management
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [characterForm, setCharacterForm] = useState({
    name: '',
    clan: 'thunder',
    level: 1,
    experience: 0,
    strength: 10,
    agility: 10,
    intelligence: 10,
    endurance: 10,
    currentHp: 100,
    maxHp: 100,
    currentLocationId: 1
  });

  // Location management
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationForm, setLocationForm] = useState({
    name: '',
    description: '',
    type: 'neutral',
    clan: null as string | null,
    maxPlayers: 50,
    dangerLevel: 1,
    x: 50,
    y: 50,
    emoji: '🌿',
    connectedTo: [] as number[]
  });

  // NPC management
  const [editingNPC, setEditingNPC] = useState<NPC | null>(null);
  const [npcForm, setNPCForm] = useState({
    name: '',
    type: 'enemy',
    level: 1,
    maxHp: 30,
    strength: 8,
    agility: 8,
    intelligence: 8,
    endurance: 8,
    description: '',
    emoji: '🐭',
    experienceReward: 25,
    spawnsInLocation: [] as number[],
    respawnTime: 120
  });

  // Update character mutation
  const updateCharacterMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<Character> }) => {
      const response = await apiRequest("PATCH", `/api/admin/characters/${data.id}`, data.updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/characters'] });
      toast({ title: "Персонаж обновлен", description: "Изменения сохранены успешно" });
      setEditingCharacter(null);
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    }
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<Location> }) => {
      const response = await apiRequest("PATCH", `/api/admin/locations/${data.id}`, data.updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      toast({ title: "Локация обновлена", description: "Изменения сохранены успешно" });
      setEditingLocation(null);
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    }
  });

  // Update NPC mutation
  const updateNPCMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<NPC> }) => {
      const response = await apiRequest("PATCH", `/api/admin/npcs/${data.id}`, data.updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/npcs'] });
      toast({ title: "NPC обновлен", description: "Изменения сохранены успешно" });
      setEditingNPC(null);
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    }
  });

  // Respawn NPC mutation
  const respawnNPCMutation = useMutation({
    mutationFn: async (npcId: number) => {
      const response = await apiRequest("POST", `/api/admin/npcs/${npcId}/respawn`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/npcs'] });
      toast({ title: "NPC возрожден", description: "NPC восстановлен с полным здоровьем" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    }
  });

  // Handle character edit
  const handleEditCharacter = (character: Character) => {
    setEditingCharacter(character);
    setCharacterForm({
      name: character.name,
      clan: character.clan,
      level: character.level,
      experience: character.experience,
      strength: character.strength,
      agility: character.agility,
      intelligence: character.intelligence,
      endurance: character.endurance,
      currentHp: character.currentHp,
      maxHp: character.maxHp,
      currentLocationId: character.currentLocationId
    });
  };

  // Handle location edit
  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setLocationForm({
      name: location.name,
      description: location.description || '',
      type: location.type,
      clan: location.clan,
      maxPlayers: location.maxPlayers || 50,
      dangerLevel: location.dangerLevel,
      x: location.x,
      y: location.y,
      emoji: location.emoji,
      connectedTo: location.connectedTo || []
    });
  };

  // Handle NPC edit
  const handleEditNPC = (npc: NPC) => {
    setEditingNPC(npc);
    setNPCForm({
      name: npc.name,
      type: npc.type,
      level: npc.level,
      maxHp: npc.maxHp,
      strength: npc.strength,
      agility: npc.agility,
      intelligence: npc.intelligence,
      endurance: npc.endurance,
      description: npc.description,
      emoji: npc.emoji,
      experienceReward: npc.experienceReward,
      spawnsInLocation: npc.spawnsInLocation,
      respawnTime: npc.respawnTime
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("adminAuthenticated");
    localStorage.removeItem("adminTimestamp");
    navigate("/");
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Админ панель</h1>
          <p className="text-muted-foreground">Управление игровым миром Cats War</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Админ-режим</Badge>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Выйти
          </Button>
        </div>
      </div>

      <Tabs defaultValue="characters" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="characters">Персонажи</TabsTrigger>
          <TabsTrigger value="locations">Локации</TabsTrigger>
          <TabsTrigger value="npcs">NPC</TabsTrigger>
          <TabsTrigger value="users">Пользователи</TabsTrigger>
        </TabsList>

        {/* Characters Tab */}
        <TabsContent value="characters" className="space-y-4">
          <div className="grid gap-4">
            {characters.map((character) => (
              <Card key={character.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {character.name}
                        <Badge variant={character.clan === 'thunder' ? 'default' : 'secondary'}>
                          {character.clan === 'thunder' ? 'Грозовое' : 'Речное'} Племя
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Уровень {character.level} • {character.experience} опыта
                      </CardDescription>
                    </div>
                    <Button onClick={() => handleEditCharacter(character)} size="sm">
                      Редактировать
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Здоровье:</span> {character.currentHp}/{character.maxHp}
                    </div>
                    <div>
                      <span className="font-medium">Сила:</span> {character.strength}
                    </div>
                    <div>
                      <span className="font-medium">Ловкость:</span> {character.agility}
                    </div>
                    <div>
                      <span className="font-medium">Интеллект:</span> {character.intelligence}
                    </div>
                    <div>
                      <span className="font-medium">Выносливость:</span> {character.endurance}
                    </div>
                    <div>
                      <span className="font-medium">Локация:</span> {character.currentLocationId}
                    </div>
                    <div>
                      <span className="font-medium">Онлайн:</span> {character.isOnline ? 'Да' : 'Нет'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Character Edit Modal */}
          {editingCharacter && (
            <Card className="fixed inset-4 z-50 bg-background border shadow-lg overflow-auto">
              <CardHeader>
                <CardTitle>Редактирование персонажа: {editingCharacter.name}</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setEditingCharacter(null)}
                  className="absolute top-4 right-4"
                >
                  ✕
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Имя</Label>
                    <Input
                      id="name"
                      value={characterForm.name}
                      onChange={(e) => setCharacterForm({...characterForm, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clan">Племя</Label>
                    <Select value={characterForm.clan} onValueChange={(value) => setCharacterForm({...characterForm, clan: value as any})}>
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
                    <Label htmlFor="level">Уровень</Label>
                    <Input
                      id="level"
                      type="number"
                      value={characterForm.level}
                      onChange={(e) => setCharacterForm({...characterForm, level: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="experience">Опыт</Label>
                    <Input
                      id="experience"
                      type="number"
                      value={characterForm.experience}
                      onChange={(e) => setCharacterForm({...characterForm, experience: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="strength">Сила</Label>
                    <Input
                      id="strength"
                      type="number"
                      value={characterForm.strength}
                      onChange={(e) => setCharacterForm({...characterForm, strength: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="agility">Ловкость</Label>
                    <Input
                      id="agility"
                      type="number"
                      value={characterForm.agility}
                      onChange={(e) => setCharacterForm({...characterForm, agility: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="intelligence">Интеллект</Label>
                    <Input
                      id="intelligence"
                      type="number"
                      value={characterForm.intelligence}
                      onChange={(e) => setCharacterForm({...characterForm, intelligence: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endurance">Выносливость</Label>
                    <Input
                      id="endurance"
                      type="number"
                      value={characterForm.endurance}
                      onChange={(e) => setCharacterForm({...characterForm, endurance: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentHp">Текущее HP</Label>
                    <Input
                      id="currentHp"
                      type="number"
                      value={characterForm.currentHp}
                      onChange={(e) => setCharacterForm({...characterForm, currentHp: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxHp">Максимальное HP</Label>
                    <Input
                      id="maxHp"
                      type="number"
                      value={characterForm.maxHp}
                      onChange={(e) => setCharacterForm({...characterForm, maxHp: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentLocationId">ID локации</Label>
                    <Input
                      id="currentLocationId"
                      type="number"
                      value={characterForm.currentLocationId}
                      onChange={(e) => setCharacterForm({...characterForm, currentLocationId: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => updateCharacterMutation.mutate({
                      id: editingCharacter.id,
                      updates: characterForm
                    })}
                    disabled={updateCharacterMutation.isPending}
                  >
                    {updateCharacterMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                  <Button variant="outline" onClick={() => setEditingCharacter(null)}>
                    Отменить
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-4">
          <div className="grid gap-4">
            {locations.map((location) => (
              <Card key={location.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {location.emoji} {location.name}
                        <Badge variant={location.type === 'camp' ? 'default' : 'secondary'}>
                          {location.type}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Опасность: {location.dangerLevel} • Позиция: ({location.x}, {location.y})
                      </CardDescription>
                    </div>
                    <Button onClick={() => handleEditLocation(location)} size="sm">
                      Редактировать
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Тип:</span> {location.type}
                    </div>
                    <div>
                      <span className="font-medium">Племя:</span> {location.clan || 'Нейтральная'}
                    </div>
                    <div>
                      <span className="font-medium">Макс. игроков:</span> {location.maxPlayers || 50}
                    </div>
                    <div>
                      <span className="font-medium">Связи:</span> {location.connectedTo?.join(', ') || 'Нет'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* NPCs Tab */}
        <TabsContent value="npcs" className="space-y-4">
          <div className="grid gap-4">
            {npcs.map((npc) => (
              <Card key={npc.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {npc.emoji} {npc.name}
                        <Badge variant={npc.type === 'boss' ? 'destructive' : 'secondary'}>
                          {npc.type}
                        </Badge>
                        {npc.isDead && (
                          <Badge variant="outline">Мертв</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Уровень {npc.level} • {npc.currentHp}/{npc.maxHp} HP
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {npc.isDead && (
                        <Button 
                          onClick={() => respawnNPCMutation.mutate(npc.id)}
                          disabled={respawnNPCMutation.isPending}
                          size="sm"
                          variant="outline"
                        >
                          Возродить
                        </Button>
                      )}
                      <Button onClick={() => handleEditNPC(npc)} size="sm">
                        Редактировать
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Сила:</span> {npc.strength}
                    </div>
                    <div>
                      <span className="font-medium">Ловкость:</span> {npc.agility}
                    </div>
                    <div>
                      <span className="font-medium">Интеллект:</span> {npc.intelligence}
                    </div>
                    <div>
                      <span className="font-medium">Выносливость:</span> {npc.endurance}
                    </div>
                    <div>
                      <span className="font-medium">Награда:</span> {npc.experienceReward} опыта
                    </div>
                    <div>
                      <span className="font-medium">Возрождение:</span> {npc.respawnTime}с
                    </div>
                    <div>
                      <span className="font-medium">Локации:</span> {npc.spawnsInLocation.join(', ')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid gap-4">
            {users.map((user) => (
              <Card key={user.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {user.username}
                    {user.isAdmin && <Badge variant="destructive">Админ</Badge>}
                  </CardTitle>
                  <CardDescription>
                    ID: {user.id} • Telegram: {user.telegramId || 'Не связан'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Создан: {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}