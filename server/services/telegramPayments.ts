import { storage } from "../storage";

export interface GamePurchase {
  id: string;
  name: string;
  description: string;
  price: number; // в Stars
  type: 'healing' | 'boost' | 'cosmetic' | 'premium' | 'character';
  data: any; // Данные товара
}

export const GAME_PURCHASES: GamePurchase[] = [
  {
    id: 'quick_heal',
    name: 'Быстрое лечение',
    description: 'Восстанавливает 50 HP мгновенно',
    price: 10,
    type: 'healing',
    data: { healAmount: 50 }
  },
  {
    id: 'full_heal',
    name: 'Полное лечение',
    description: 'Восстанавливает здоровье полностью',
    price: 25,
    type: 'healing',
    data: { healAmount: 'full' }
  },
  {
    id: 'exp_boost_1h',
    name: 'Ускорение опыта (1ч)',
    description: 'Двойной опыт в течение часа',
    price: 50,
    type: 'boost',
    data: { multiplier: 2, duration: 3600 }
  },
  {
    id: 'exp_boost_24h',
    name: 'Ускорение опыта (24ч)',
    description: 'Двойной опыт в течение суток',
    price: 200,
    type: 'boost',
    data: { multiplier: 2, duration: 86400 }
  },
  {
    id: 'rare_fur',
    name: 'Редкий окрас',
    description: 'Уникальная внешность персонажа',
    price: 100,
    type: 'cosmetic',
    data: { furType: 'golden' }
  },
  {
    id: 'premium_month',
    name: 'Премиум (месяц)',
    description: 'Все премиум преимущества на месяц',
    price: 500,
    type: 'premium',
    data: { duration: 2592000 } // 30 дней
  }
];

export class TelegramPayments {
  
  static createInvoice(purchase: GamePurchase, userId: number) {
    return {
      title: purchase.name,
      description: purchase.description,
      payload: JSON.stringify({ 
        purchaseId: purchase.id, 
        userId,
        timestamp: Date.now()
      }),
      provider_token: "", // Пустой для Stars
      currency: "XTR",
      prices: [{ 
        amount: purchase.price, 
        label: purchase.name 
      }]
    };
  }

  static async processPurchase(paymentData: any): Promise<boolean> {
    try {
      const payload = JSON.parse(paymentData.invoice_payload);
      const purchase = GAME_PURCHASES.find(p => p.id === payload.purchaseId);
      
      if (!purchase) {
        console.error('Unknown purchase:', payload.purchaseId);
        return false;
      }

      const character = await storage.getCharactersByUserId(payload.userId);
      if (!character || character.length === 0) {
        console.error('No character found for user:', payload.userId);
        return false;
      }

      const mainCharacter = character[0]; // Используем первого персонажа

      switch (purchase.type) {
        case 'healing':
          await this.applyHealing(mainCharacter.id, purchase.data);
          break;
          
        case 'boost':
          await this.applyBoost(mainCharacter.id, purchase.data);
          break;
          
        case 'cosmetic':
          await this.applyCosmetic(mainCharacter.id, purchase.data);
          break;
          
        case 'premium':
          await this.applyPremium(payload.userId, purchase.data);
          break;
          
        default:
          console.error('Unknown purchase type:', purchase.type);
          return false;
      }

      // Создаем событие о покупке
      await storage.createGameEvent({
        type: 'purchase',
        characterId: mainCharacter.id,
        locationId: mainCharacter.currentLocationId,
        data: {
          purchaseId: purchase.id,
          price: purchase.price,
          paymentId: paymentData.telegram_payment_charge_id
        }
      });

      return true;
    } catch (error) {
      console.error('Error processing purchase:', error);
      return false;
    }
  }

  private static async applyHealing(characterId: number, data: any) {
    const character = await storage.getCharacter(characterId);
    if (!character) return;

    let newHp;
    if (data.healAmount === 'full') {
      newHp = character.maxHp;
    } else {
      newHp = Math.min(character.maxHp, character.currentHp + data.healAmount);
    }

    await storage.updateCharacter(characterId, { currentHp: newHp });
    console.log(`Healed character ${characterId} for ${newHp - character.currentHp} HP`);
  }

  private static async applyBoost(characterId: number, data: any) {
    // В реальной реализации здесь был бы отдельный стол для активных бустов
    // Пока что просто логируем
    console.log(`Applied boost to character ${characterId}:`, data);
    
    // Можно сохранить буст в JSON поле персонажа или создать отдельную таблицу
    const character = await storage.getCharacter(characterId);
    if (character) {
      // Добавляем буст к персонажу (в реальной игре нужна отдельная таблица бустов)
      console.log(`Boost applied: ${data.multiplier}x EXP for ${data.duration} seconds`);
    }
  }

  private static async applyCosmetic(characterId: number, data: any) {
    console.log(`Applied cosmetic to character ${characterId}:`, data);
    // В реальной игре здесь было бы обновление внешности персонажа
  }

  private static async applyPremium(userId: number, data: any) {
    const expiresAt = new Date(Date.now() + data.duration * 1000);
    console.log(`Applied premium to user ${userId} until ${expiresAt}`);
    
    // В реальной игре нужно добавить поле premium_expires_at к пользователю
    // await storage.updateUser(userId, { premiumExpiresAt: expiresAt });
  }

  static getPurchaseByid(id: string): GamePurchase | undefined {
    return GAME_PURCHASES.find(p => p.id === id);
  }

  static getPurchasesByType(type: string): GamePurchase[] {
    return GAME_PURCHASES.filter(p => p.type === type);
  }
}