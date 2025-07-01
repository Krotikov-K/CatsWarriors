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
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CLANS } from "@shared/schema";

const characterSchema = z.object({
  name: z.string().min(2, "Имя должно содержать минимум 2 символа").max(20, "Имя не должно превышать 20 символов"),
  clan: z.enum(["thunder", "shadow", "wind", "river"]),
  strength: z.number().min(10).max(25),
  agility: z.number().min(10).max(25),
  intelligence: z.number().min(10).max(25),
  endurance: z.number().min(10).max(25),
});

type CharacterFormData = z.infer<typeof characterSchema>;

export default function CharacterCreation() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [availablePoints, setAvailablePoints] = useState(20);

  const form = useForm<CharacterFormData>({
    resolver: zodResolver(characterSchema),
    defaultValues: {
      name: "",
      clan: "thunder",
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
        userId: 1, // Demo user ID
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Персонаж создан!",
        description: "Ваш кот-воитель готов к приключениям.",
      });
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
  const remainingPoints = 20 - totalStatsUsed;

  const updateAvailablePoints = () => {
    setAvailablePoints(remainingPoints);
  };

  const onSubmit = (data: CharacterFormData) => {
    if (totalStatsUsed > 20) {
      toast({
        title: "Превышен лимит очков",
        description: "Вы не можете потратить больше 20 очков характеристик.",
        variant: "destructive",
      });
      return;
    }
    createCharacterMutation.mutate(data);
  };

  const handleStatChange = (field: keyof CharacterFormData, value: number[]) => {
    const newValue = value[0];
    const currentValues = form.getValues();
    const otherStats = Object.entries(currentValues)
      .filter(([key]) => key !== field && ["strength", "agility", "intelligence", "endurance"].includes(key))
      .reduce((sum, [, val]) => sum + (val as number), 0);
    
    if (otherStats + newValue - 40 <= 20) {
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

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl bg-card-bg border-border-dark">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-gaming text-forest">
            <i className="fas fa-cat mr-3"></i>
            Создание кота-воителя
          </CardTitle>
          <p className="text-gray-400">Создайте своего персонажа для мира Котов Воителей</p>
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
                    <FormLabel className="text-gray-300">Имя кота</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Например: Огнезвёзд, Серебрянка..."
                        className="bg-gray-800 border-border-dark text-white"
                        {...field}
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
                    <FormLabel className="text-gray-300">Племя</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-gray-800 border-border-dark text-white">
                          <SelectValue placeholder="Выберите племя" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-gray-800 border-border-dark">
                        {Object.entries(CLANS).map(([key, clan]) => (
                          <SelectItem key={key} value={key} className="text-white hover:bg-gray-700">
                            {clan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-400 mt-1">
                      {getClanDescription(field.value)}
                    </p>
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
                            max={25}
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
                            max={25}
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
                            max={25}
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
                            max={25}
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
