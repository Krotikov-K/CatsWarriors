import TelegramBot from "node-telegram-bot-api";
import { storage } from "../storage";
import { GameEngine } from "./gameEngine";
import { TelegramPayments, GAME_PURCHASES } from "./telegramPayments";

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
      this.setupBotCommands().catch(console.error);
      this.isInitialized = true;
      console.log("Telegram bot initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Telegram bot:", error);
    }
  }

  private async setupBotCommands() {
    if (!this.bot) return;

    // Set bot commands for better UX
    await this.bot.setMyCommands([
      { command: 'start', description: '🎮 Начать игру' },
      { command: 'help', description: 'ℹ️ Помощь и команды' },
      { command: 'play', description: '🐱 Открыть игру' },
      { command: 'status', description: '📊 Статус персонажа' }
    ]);
    console.log("Telegram bot commands set up");
  }

  private setupCommands() {
    if (!this.bot) return;

    // Start command with Web App button
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();
      const userName = msg.from?.first_name || msg.from?.username || 'Котёнок';
      
      if (!telegramId) return;

      // Check if user already exists
      const existingUser = await storage.getUserByTelegramId(telegramId);
      
      const webAppUrl = process.env.WEB_APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
      
      const options = {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🎮 Играть в Cats War",
                web_app: { url: webAppUrl }
              }
            ],
            [
              {
                text: "ℹ️ Как играть",
                callback_data: "help"
              }
            ]
          ]
        }
      };

      if (existingUser) {
        await this.bot?.sendMessage(chatId, 
          `🐱 Добро пожаловать обратно в Cats War, ${existingUser.username}!\n\n` +
          "Ваш аккаунт привязан к игре. Нажмите кнопку ниже, чтобы играть:",
          options
        );
      } else {
        // Create new user
        try {
          const newUser = await storage.createUser({
            username: userName,
            password: '', // Not used for Telegram auth
            telegramId: telegramId
          });
          
          await this.bot?.sendMessage(chatId,
            `🐱 Добро пожаловать в Cats War, ${userName}!\n\n` +
            "Это ММО РПГ по вселенной 'Коты Воители'.\n\n" +
            "Ваш аккаунт создан! Нажмите кнопку ниже, чтобы играть:",
            options
          );
        } catch (error) {
          console.error('Error creating user:', error);
          await this.bot?.sendMessage(chatId, "Произошла ошибка при создании аккаунта. Попробуйте позже.");
        }
      }
    });

    // Play command
    this.bot.onText(/\/play/, async (msg) => {
      const chatId = msg.chat.id;
      const webAppUrl = process.env.WEB_APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
      
      const options = {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🎮 Играть в Cats War",
                web_app: { url: webAppUrl }
              }
            ]
          ]
        }
      };

      await this.bot?.sendMessage(chatId,
        "🐱 Добро пожаловать в Cats War!\n\nНажмите кнопку ниже, чтобы начать игру:",
        options
      );
    });

    // Help command
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      await this.bot?.sendMessage(chatId,
        "🎮 Команды Cats War:\n\n" +
        "/start - начать игру\n" +
        "/play - открыть веб-интерфейс игры\n" +
        "/status - показать статус персонажа\n" +
        "/help - эта справка\n\n" +
        "Cats War - это ММО РПГ по вселенной 'Коты Воители'. Создайте своего кота-воителя и присоединитесь к одному из четырех племен!"
      );
    });

    // Callback query handler
    this.bot.on('callback_query', async (query) => {
      const chatId = query.message?.chat.id;
      const data = query.data;

      if (!chatId) return;

      if (data === 'help') {
        await this.bot?.sendMessage(chatId,
          "🎮 Как играть в Cats War:\n\n" +
          "1. Создайте своего кота-воителя\n" +
          "2. Выберите племя (Грозовое, Речное, Ветра или Тени)\n" +
          "3. Распределите очки характеристик\n" +
          "4. Исследуйте территории и сражайтесь с другими котами\n" +
          "5. Повышайте уровень и становитесь сильнее!\n\n" +
          "Используйте /play для входа в игру."
        );
      }

      await this.bot?.answerCallbackQuery(query.id);
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

    // Shop command disabled
    this.bot.onText(/\/shop/, async (msg) => {
      const chatId = msg.chat.id;
      await this.bot?.sendMessage(chatId, 
        "🚧 Магазин временно недоступен\n\n" +
        "Функция находится в разработке и будет добавлена в будущих обновлениях."
      );
    });

    // Handle purchase callbacks
    this.bot.on('callback_query', async (query) => {
      const chatId = query.message?.chat.id;
      const data = query.data;
      const telegramId = query.from.id.toString();

      if (!chatId || !data) return;

      if (data === 'help') {
        await this.bot?.sendMessage(chatId,
          "🎮 Как играть в Cats War:\n\n" +
          "1. Создайте своего кота-воителя\n" +
          "2. Выберите племя (Грозовое или Речное)\n" +
          "3. Распределите очки характеристик\n" +
          "4. Исследуйте территории и сражайтесь с NPC\n" +
          "5. Повышайте уровень и становитесь сильнее!\n\n" +
          "Используйте /play для входа в игру."
        );
      }

      await this.bot?.answerCallbackQuery(query.id);
    });

    // Payment handlers disabled for now
    // this.bot.on('pre_checkout_query', async (query) => { ... });
    // this.bot.on('successful_payment', async (msg) => { ... });

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
    // Combat notifications disabled - all combat happens in-game
    return;
  }

  async notifyCombatEnd(characterId: number, victory: boolean): Promise<void> {
    // Combat notifications disabled - all combat happens in-game
    return;
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
