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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [characterDialogOpen, setCharacterDialogOpen] = useState(false);
  const [characterForm, setCharacterForm] = useState({
    name: '',
    clan: 'thunder',
    gender: 'male',
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
      setCharacterDialogOpen(false);
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
      gender: character.gender || 'male',
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
    setCharacterDialogOpen(true);
  };

  const handleSaveCharacter = () => {
    if (!editingCharacter) return;
    
    updateCharacterMutation.mutate({
      id: editingCharacter.id,
      updates: characterForm
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
                        {character.name} {character.gender === 'female' ? '🐈' : '🐱'}
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

        </TabsContent>

        {/* Character Edit Dialog */}
        <Dialog open={characterDialogOpen} onOpenChange={setCharacterDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Редактирование персонажа: {editingCharacter?.name}</DialogTitle>
              <DialogDescription>
                Изменение характеристик и параметров персонажа
              </DialogDescription>
            </DialogHeader>
            
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
                <Label htmlFor="gender">Пол</Label>
                <Select value={characterForm.gender} onValueChange={(value) => setCharacterForm({...characterForm, gender: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Самец</SelectItem>
                    <SelectItem value="female">Самка</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="clan">Племя</Label>
                <Select value={characterForm.clan} onValueChange={(value) => setCharacterForm({...characterForm, clan: value})}>
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
                <Label htmlFor="currentLocationId">Локация</Label>
                <Select 
                  value={characterForm.currentLocationId.toString()} 
                  onValueChange={(value) => setCharacterForm({...characterForm, currentLocationId: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="level">Уровень</Label>
                <Input
                  id="level"
                  type="number"
                  min="1"
                  max="100"
                  value={characterForm.level}
                  onChange={(e) => setCharacterForm({...characterForm, level: parseInt(e.target.value) || 1})}
                />
              </div>
              
              <div>
                <Label htmlFor="experience">Опыт</Label>
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  value={characterForm.experience}
                  onChange={(e) => setCharacterForm({...characterForm, experience: parseInt(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <Label htmlFor="currentHp">Текущее здоровье</Label>
                <Input
                  id="currentHp"
                  type="number"
                  min="0"
                  max={characterForm.maxHp}
                  value={characterForm.currentHp}
                  onChange={(e) => setCharacterForm({...characterForm, currentHp: parseInt(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <Label htmlFor="maxHp">Максимальное здоровье</Label>
                <Input
                  id="maxHp"
                  type="number"
                  min="1"
                  value={characterForm.maxHp}
                  onChange={(e) => setCharacterForm({...characterForm, maxHp: parseInt(e.target.value) || 1})}
                />
              </div>
              
              <div>
                <Label htmlFor="strength">Сила</Label>
                <Input
                  id="strength"
                  type="number"
                  min="1"
                  max="100"
                  value={characterForm.strength}
                  onChange={(e) => setCharacterForm({...characterForm, strength: parseInt(e.target.value) || 1})}
                />
              </div>
              
              <div>
                <Label htmlFor="agility">Ловкость</Label>
                <Input
                  id="agility"
                  type="number"
                  min="1"
                  max="100"
                  value={characterForm.agility}
                  onChange={(e) => setCharacterForm({...characterForm, agility: parseInt(e.target.value) || 1})}
                />
              </div>
              
              <div>
                <Label htmlFor="intelligence">Интеллект</Label>
                <Input
                  id="intelligence"
                  type="number"
                  min="1"
                  max="100"
                  value={characterForm.intelligence}
                  onChange={(e) => setCharacterForm({...characterForm, intelligence: parseInt(e.target.value) || 1})}
                />
              </div>
              
              <div>
                <Label htmlFor="endurance">Выносливость</Label>
                <Input
                  id="endurance"
                  type="number"
                  min="1"
                  max="100"
                  value={characterForm.endurance}
                  onChange={(e) => setCharacterForm({...characterForm, endurance: parseInt(e.target.value) || 1})}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setCharacterDialogOpen(false)}
              >
                Отмена
              </Button>
              <Button 
                onClick={handleSaveCharacter}
                disabled={updateCharacterMutation.isPending}
              >
                {updateCharacterMutation.isPending ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-4">
          <div className="grid gap-4">
            {locations.map((location) => (
              <Card key={location.id}>
                <CardHeader>
                  <CardTitle>{location.name}</CardTitle>
                  <CardDescription>{location.description}</CardDescription>
                </CardHeader>
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
                  <CardTitle>{npc.name}</CardTitle>
                  <CardDescription>Уровень {npc.level}</CardDescription>
                </CardHeader>
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
                  <CardTitle>{user.username}</CardTitle>
                  <CardDescription>ID: {user.id}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-4">
          <div className="grid gap-4">
            {locations.map((location) => (
              <Card key={location.id}>
                <CardHeader>
                  <CardTitle>{location.name}</CardTitle>
                  <CardDescription>{location.description}</CardDescription>
                </CardHeader>
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
                  <CardTitle>{npc.name}</CardTitle>
                  <CardDescription>Уровень {npc.level}</CardDescription>
                </CardHeader>
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
                  <CardTitle>{user.username}</CardTitle>
                  <CardDescription>ID: {user.id} • Telegram: {user.telegramId || 'Не связан'}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}