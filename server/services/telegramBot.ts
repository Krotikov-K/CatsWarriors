import TelegramBot from "node-telegram-bot-api";
import { storage } from "../storage";
import { GameEngine } from "./gameEngine";

export class TelegramBotService {
  private bot: TelegramBot | null = null;
  private isInitialized = false;

  constructor() {
    this.initializeBot();
  }

  private initializeBot() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.warn("TELEGRAM_BOT_TOKEN not provided, Telegram bot disabled");
      return;
    }

    try {
      this.bot = new TelegramBot(token, { polling: true });
      this.setupCommands();
      this.isInitialized = true;
      console.log("Telegram bot initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Telegram bot:", error);
    }
  }

  private setupCommands() {
    if (!this.bot) return;

    // Start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();
      
      if (!telegramId) return;

      // Check if user already exists
      const existingUser = await storage.getUserByTelegramId(telegramId);
      
      if (existingUser) {
        await this.bot?.sendMessage(chatId, 
          `Добро пожаловать обратно в Cats War, ${existingUser.username}!\n\n` +
          "Ваш аккаунт уже привязан к игре. Откройте веб-интерфейс для игры."
        );
      } else {
        await this.bot?.sendMessage(chatId,
          "🐱 Добро пожаловать в Cats War!\n\n" +
          "Это ММО РПГ по вселенной 'Коты Воители'.\n\n" +
          "Для начала игры:\n" +
          "1. Зарегистрируйтесь на сайте\n" +
          "2. Используйте команду /link для привязки аккаунта\n" +
          "3. Создайте своего кота-воителя\n\n" +
          "Команды:\n" +
          "/help - помощь\n" +
          "/link <username> - привязать аккаунт\n" +
          "/status - статус персонажа\n" +
          "/location - текущая локация"
        );
      }
    });

    // Help command
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      await this.bot?.sendMessage(chatId,
        "🎮 Команды Cats War:\n\n" +
        "/start - начать работу с ботом\n" +
        "/link <username> - привязать аккаунт игры\n" +
        "/status - показать статус персонажа\n" +
        "/location - информация о текущей локации\n" +
        "/move <location> - переместиться в локацию\n" +
        "/combat - информация о текущем бое\n" +
        "/help - эта справка\n\n" +
        "🌐 Откройте веб-интерфейс для полного игрового опыта!"
      );
    });

    // Link account command
    this.bot.onText(/\/link (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();
      const username = match?.[1];

      if (!telegramId || !username) {
        await this.bot?.sendMessage(chatId, "Ошибка: неверный формат команды");
        return;
      }

      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          await this.bot?.sendMessage(chatId, 
            "Пользователь не найден. Сначала зарегистрируйтесь на сайте игры."
          );
          return;
        }

        if (user.telegramId) {
          await this.bot?.sendMessage(chatId, 
            "Этот аккаунт уже привязан к другому Telegram аккаунту."
          );
          return;
        }

        // Link the account
        await storage.updateUser(user.id, { telegramId });
        await this.bot?.sendMessage(chatId,
          `✅ Аккаунт успешно привязан!\n\n` +
          `Игрок: ${username}\n` +
          "Теперь вы будете получать уведомления об игровых событиях."
        );
      } catch (error) {
        console.error("Error linking account:", error);
        await this.bot?.sendMessage(chatId, "Ошибка при привязке аккаунта");
      }
    });

    // Status command
    this.bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();

      if (!telegramId) return;

      try {
        const user = await storage.getUserByTelegramId(telegramId);
        if (!user) {
          await this.bot?.sendMessage(chatId, 
            "Аккаунт не привязан. Используйте /link для привязки аккаунта."
          );
          return;
        }

        const characters = await storage.getCharactersByUserId(user.id);
        if (characters.length === 0) {
          await this.bot?.sendMessage(chatId,
            "У вас нет персонажей. Создайте персонажа в веб-интерфейсе игры."
          );
          return;
        }

        const character = characters[0]; // Use first character
        const location = await storage.getLocation(character.currentLocationId);
        const stats = GameEngine.calculateDerivedStats(character);

        await this.bot?.sendMessage(chatId,
          `🐱 ${character.name}\n` +
          `🏠 Племя: ${this.getClanName(character.clan)}\n` +
          `⭐ Уровень: ${character.level}\n` +
          `❤️ Здоровье: ${character.currentHp}/${character.maxHp}\n` +
          `📍 Локация: ${location?.name || 'Неизвестно'}\n\n` +
          `📊 Характеристики:\n` +
          `💪 Сила: ${character.strength}\n` +
          `🏃 Ловкость: ${character.agility}\n` +
          `🧠 Интеллект: ${character.intelligence}\n` +
          `🛡️ Стойкость: ${character.endurance}\n\n` +
          `⚔️ Урон: ${stats.damage.min}-${stats.damage.max}\n` +
          `🏃 Уворот: ${stats.dodgeChance.toFixed(1)}%\n` +
          `🛡️ Блок: ${stats.blockChance.toFixed(1)}%`
        );
      } catch (error) {
        console.error("Error getting status:", error);
        await this.bot?.sendMessage(chatId, "Ошибка при получении статуса");
      }
    });

    console.log("Telegram bot commands set up");
  }

  async sendNotification(telegramId: string, message: string): Promise<void> {
    if (!this.bot || !this.isInitialized) return;

    try {
      await this.bot.sendMessage(telegramId, message);
    } catch (error) {
      console.error("Error sending Telegram notification:", error);
    }
  }

  async notifyCombatStart(participants: number[], locationName: string): Promise<void> {
    for (const characterId of participants) {
      const character = await storage.getCharacter(characterId);
      if (!character) continue;

      const user = await storage.getUser(character.userId);
      if (!user?.telegramId) continue;

      await this.sendNotification(
        user.telegramId,
        `⚔️ Бой начался!\n\n` +
        `Ваш персонаж ${character.name} вступил в бой в локации "${locationName}".\n\n` +
        `Откройте игру для наблюдения за боем!`
      );
    }
  }

  async notifyCombatEnd(characterId: number, victory: boolean): Promise<void> {
    const character = await storage.getCharacter(characterId);
    if (!character) return;

    const user = await storage.getUser(character.userId);
    if (!user?.telegramId) return;

    const message = victory 
      ? `🏆 Победа!\n\nВаш персонаж ${character.name} одержал победу в бою!`
      : `💀 Поражение\n\nВаш персонаж ${character.name} потерпел поражение в бою.`;

    await this.sendNotification(user.telegramId, message);
  }

  private getClanName(clan: string): string {
    const names: Record<string, string> = {
      thunder: "Грозовое Племя",
      shadow: "Теневое Племя", 
      wind: "Ветряное Племя",
      river: "Речное Племя"
    };
    return names[clan] || clan;
  }

  isEnabled(): boolean {
    return this.isInitialized && this.bot !== null;
  }
}

export const telegramBot = new TelegramBotService();
