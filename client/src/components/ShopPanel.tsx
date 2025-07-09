import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Heart, Zap, Sparkles } from "lucide-react";

interface Purchase {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'healing' | 'boost' | 'cosmetic' | 'premium';
}

const SHOP_ITEMS: Purchase[] = [
  {
    id: 'quick_heal',
    name: 'Быстрое лечение',
    description: 'Восстанавливает 50 HP мгновенно',
    price: 10,
    type: 'healing'
  },
  {
    id: 'full_heal',
    name: 'Полное лечение',
    description: 'Восстанавливает здоровье полностью',
    price: 25,
    type: 'healing'
  },
  {
    id: 'exp_boost_1h',
    name: 'Ускорение опыта (1ч)',
    description: 'Двойной опыт в течение часа',
    price: 50,
    type: 'boost'
  },
  {
    id: 'exp_boost_24h',
    name: 'Ускорение опыта (24ч)',
    description: 'Двойной опыт в течение суток',
    price: 200,
    type: 'boost'
  },
  {
    id: 'rare_fur',
    name: 'Редкий окрас',
    description: 'Уникальная внешность персонажа',
    price: 100,
    type: 'cosmetic'
  },
  {
    id: 'premium_month',
    name: 'Премиум (месяц)',
    description: 'Все премиум преимущества на месяц',
    price: 500,
    type: 'premium'
  }
];

const getItemIcon = (type: string) => {
  switch (type) {
    case 'healing': return <Heart className="h-5 w-5 text-red-400" />;
    case 'boost': return <Zap className="h-5 w-5 text-yellow-400" />;
    case 'cosmetic': return <Sparkles className="h-5 w-5 text-purple-400" />;
    case 'premium': return <Star className="h-5 w-5 text-blue-400" />;
    default: return <Star className="h-5 w-5 text-gray-400" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'healing': return 'bg-red-500/20 text-red-300 border-red-500/30';
    case 'boost': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    case 'cosmetic': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    case 'premium': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'healing': return 'Лечение';
    case 'boost': return 'Буст';
    case 'cosmetic': return 'Внешность';
    case 'premium': return 'Премиум';
    default: return type;
  }
};

export default function ShopPanel() {
  const handlePurchase = (item: Purchase) => {
    // Open Telegram shop command or show instructions
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.showAlert(
        `Для покупки "${item.name}" за ${item.price} ⭐ Stars:\n\n` +
        `1. Закройте игру\n` +
        `2. Введите команду /shop в чате с ботом\n` +
        `3. Выберите нужный товар\n` +
        `4. Оплатите через Telegram Stars`
      );
    } else {
      alert(
        `Для покупки "${item.name}" за ${item.price} ⭐ Stars:\n\n` +
        `Введите команду /shop в чате с Telegram ботом игры`
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          🛒 Магазин
        </h2>
        <p className="text-gray-400">
          Покупки за Telegram Stars
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SHOP_ITEMS.map((item) => (
          <Card key={item.id} className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getItemIcon(item.type)}
                  <CardTitle className="text-lg text-white">
                    {item.name}
                  </CardTitle>
                </div>
                <Badge 
                  variant="outline" 
                  className={getTypeColor(item.type)}
                >
                  {getTypeLabel(item.type)}
                </Badge>
              </div>
              <CardDescription className="text-gray-400">
                {item.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-yellow-400 font-bold">
                  <Star className="h-4 w-4" />
                  {item.price} Stars
                </div>
                <Button
                  onClick={() => handlePurchase(item)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Купить
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-blue-900/20 border-blue-500/30 mt-6">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Star className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-300 mb-2">
                Как купить Telegram Stars:
              </h3>
              <div className="text-sm text-gray-300 space-y-1">
                <p>• Через App Store/Google Play</p>
                <p>• В настройках Telegram Premium</p>
                <p>• У @PremiumBot в Telegram</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-green-900/20 border-green-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-green-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-300 mb-2">
                Как совершить покупку:
              </h3>
              <div className="text-sm text-gray-300 space-y-1">
                <p>1. Введите команду <code className="bg-gray-700 px-1 rounded">/shop</code> в чате с ботом</p>
                <p>2. Выберите нужный товар</p>
                <p>3. Оплатите через Telegram Stars</p>
                <p>4. Товар автоматически добавится к персонажу</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}