import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CLANS } from "@shared/schema";
import { useTelegramWebApp } from "@/hooks/useTelegramWebApp";
import { useUser } from "@/hooks/useUser";

const characterSchema = z.object({
  name: z.string().min(2, "Имя должно содержать минимум 2 символа").max(20, "Имя не должно превышать 20 символов"),
  clan: z.enum(["thunder", "shadow", "wind", "river"]),
  gender: z.enum(["male", "female"]),
  strength: z.number().min(10).max(20),
  agility: z.number().min(10).max(20),
  intelligence: z.number().min(10).max(20),
  endurance: z.number().min(10).max(20),
});

type CharacterFormData = z.infer<typeof characterSchema>;

export default function CharacterCreation() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { hapticFeedback } = useTelegramWebApp();
  const { user } = useUser();
  const [availablePoints, setAvailablePoints] = useState(10);

  const form = useForm<CharacterFormData>({
    resolver: zodResolver(characterSchema),
    defaultValues: {
      name: "",
      clan: "thunder",
      gender: "male",
      strength: 10,
      agility: 10,
      intelligence: 10,
      endurance: 10,
    },
  });

  const createCharacterMutation = useMutation({
    mutationFn: async (data: CharacterFormData) => {
      const response = await apiRequest("POST", "/api/characters", {
        ...data,
        userId: user?.id || 1,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Персонаж создан!",
        description: "Ваш кот-воитель готов к приключениям.",
      });
      // Clear all cache and force refetch
      queryClient.clear();
      // Navigate immediately
      navigate("/");
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка создания персонажа",
        description: error.message || "Не удалось создать персонажа",
        variant: "destructive",
      });
    },
  });

  const watchedStats = form.watch(["strength", "agility", "intelligence", "endurance"]);
  const totalStatsUsed = watchedStats.reduce((sum, stat) => sum + stat, 0) - 40; // Subtract base points (10 each)
  const remainingPoints = 10 - totalStatsUsed;

  const updateAvailablePoints = () => {
    setAvailablePoints(remainingPoints);
  };

  const onSubmit = (data: CharacterFormData) => {
    if (totalStatsUsed > 10) {
      hapticFeedback('heavy');
      toast({
        title: "Превышен лимит очков",
        description: "Вы не можете потратить больше 10 очков характеристик.",
        variant: "destructive",
      });
      return;
    }
    hapticFeedback('medium');
    createCharacterMutation.mutate(data);
  };

  const handleStatChange = (field: keyof CharacterFormData, value: number[]) => {
    const newValue = value[0];
    const currentValues = form.getValues();
    const otherStats = Object.entries(currentValues)
      .filter(([key]) => key !== field && ["strength", "agility", "intelligence", "endurance"].includes(key))
      .reduce((sum, [, val]) => sum + (val as number), 0);
    
    if (otherStats + newValue - 40 <= 10) {
      form.setValue(field as any, newValue);
      updateAvailablePoints();
    }
  };

  const getClanDescription = (clan: string) => {
    const descriptions = {
      thunder: "Благородные и смелые коты, живущие в лесу. Отличные охотники и воины.",
      shadow: "Хитрые и скрытные коты болот. Мастера засад и ночных атак.",
      wind: "Быстрые коты открытых пустошей. Непревзойденные бегуны и следопыты.",
      river: "Умелые пловцы и рыболовы. Мудрые и спокойные коты у воды.",
    };
    return descriptions[clan as keyof typeof descriptions] || "";
  };

  const getClanEmoji = (clan: string) => {
    const emojis = {
      thunder: "⚡",
      shadow: "🌙",
      wind: "💨",
      river: "🌊",
    };
    return emojis[clan as keyof typeof emojis] || "🐱";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 safe-area-inset">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-gaming text-foreground">
            🐱 Создание кота-воителя
          </CardTitle>
          <p className="text-muted-foreground text-sm">Создайте своего персонажа для мира Котов Воителей</p>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Character Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Имя кота</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Например: Огнезвёзд, Серебрянка..."
                        className="bg-input border-border text-foreground"
                        {...field}
                        onFocus={() => hapticFeedback('light')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Clan Selection */}
              <FormField
                control={form.control}
                name="clan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Племя</FormLabel>
                    <Select value={field.value} onValueChange={(value) => {
                      hapticFeedback('light');
                      field.onChange(value);
                    }}>
                      <FormControl>
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue placeholder="Выберите племя" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover border-border">
                        {Object.entries(CLANS).map(([key, clan]) => (
                          <SelectItem key={key} value={key} className="text-popover-foreground">
                            <span className={`clan-${key} font-medium`}>{getClanEmoji(key)}</span> {clan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getClanDescription(field.value)}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Gender Selection */}
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Пол</FormLabel>
                    <Select value={field.value} onValueChange={(value) => {
                      hapticFeedback('light');
                      field.onChange(value);
                    }}>
                      <FormControl>
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue placeholder="Выберите пол" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="male" className="text-popover-foreground">
                          🐱 Кот
                        </SelectItem>
                        <SelectItem value="female" className="text-popover-foreground">
                          🐈 Кошка
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Stats */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-gaming text-forest">Характеристики</h3>
                  <div className="text-sm text-gray-400">
                    Осталось очков: <span className="font-stats text-white">{remainingPoints}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strength */}
                  <FormField
                    control={form.control}
                    name="strength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center text-gray-300">
                          <i className="fas fa-fist-raised text-red-400 mr-2"></i>
                          Сила: {field.value}
                        </FormLabel>
                        <FormControl>
                          <Slider
                            min={10}
                            max={20}
                            step={1}
                            value={[field.value]}
                            onValueChange={(value) => handleStatChange("strength", value)}
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Agility */}
                  <FormField
                    control={form.control}
                    name="agility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center text-gray-300">
                          <i className="fas fa-running text-green-400 mr-2"></i>
                          Ловкость: {field.value}
                        </FormLabel>
                        <FormControl>
                          <Slider
                            min={10}
                            max={20}
                            step={1}
                            value={[field.value]}
                            onValueChange={(value) => handleStatChange("agility", value)}
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Intelligence */}
                  <FormField
                    control={form.control}
                    name="intelligence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center text-gray-300">
                          <i className="fas fa-brain text-blue-400 mr-2"></i>
                          Интеллект: {field.value}
                        </FormLabel>
                        <FormControl>
                          <Slider
                            min={10}
                            max={20}
                            step={1}
                            value={[field.value]}
                            onValueChange={(value) => handleStatChange("intelligence", value)}
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Endurance */}
                  <FormField
                    control={form.control}
                    name="endurance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center text-gray-300">
                          <i className="fas fa-shield-alt text-yellow-400 mr-2"></i>
                          Стойкость: {field.value}
                        </FormLabel>
                        <FormControl>
                          <Slider
                            min={10}
                            max={20}
                            step={1}
                            value={[field.value]}
                            onValueChange={(value) => handleStatChange("endurance", value)}
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={createCharacterMutation.isPending || remainingPoints < 0}
                className="w-full game-button-primary text-lg py-6"
              >
                {createCharacterMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Создание персонажа...
                  </>
                ) : (
                  <>
                    <i className="fas fa-cat mr-2"></i>
                    Создать кота-воителя
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
