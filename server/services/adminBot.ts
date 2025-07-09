import TelegramBot from "node-telegram-bot-api";

interface AdminSession {
  userId: number;
  authenticated: boolean;
  timestamp: number;
}

class AdminBotService {
  private bot: TelegramBot | null = null;
  private adminSessions: Map<number, AdminSession> = new Map();
  private readonly ADMIN_PASSWORD = "3138";
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.initializeBot();
  }

  private initializeBot() {
    const adminToken = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
    if (!adminToken) {
      console.log("Admin bot token not provided, admin bot disabled");
      return;
    }

    try {
      this.bot = new TelegramBot(adminToken, { polling: true });
      this.setupCommands();
      this.setupMessageHandlers();
      console.log("Admin bot initialized successfully");
    } catch (error) {
      console.error("Failed to initialize admin bot:", error);
    }
  }

  private setupCommands() {
    if (!this.bot) return;

    this.bot.setMyCommands([
      { command: "start", description: "Начать работу с админ-панелью" },
      { command: "admin", description: "Открыть админ-панель" },
      { command: "logout", description: "Выйти из админ-панели" },
      { command: "help", description: "Помощь по командам" }
    ]);
  }

  private setupMessageHandlers() {
    if (!this.bot) return;

    this.bot.on("message", (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      const text = msg.text;

      if (!userId || !text) return;

      console.log(`Admin bot message from ${userId}: ${text}`);

      if (text.startsWith("/start")) {
        this.handleStart(chatId, userId);
      } else if (text.startsWith("/admin")) {
        this.handleAdminCommand(chatId, userId);
      } else if (text.startsWith("/logout")) {
        this.handleLogout(chatId, userId);
      } else if (text.startsWith("/help")) {
        this.handleHelp(chatId, userId);
      } else if (text === this.ADMIN_PASSWORD) {
        this.handlePasswordAuth(chatId, userId);
      } else {
        this.handleUnknownCommand(chatId, userId);
      }
    });

    this.bot.on("polling_error", (error) => {
      console.error("Admin bot polling error:", error);
    });
  }

  private async handleStart(chatId: number, userId: number) {
    if (!this.bot) return;

    const welcomeMessage = `🔒 Добро пожаловать в админ-панель Cats War!

Это защищенная админ-панель для управления игрой.

Для доступа к админ-функциям введите пароль администратора или используйте команду /admin.

Доступные команды:
/admin - Открыть админ-панель  
/logout - Выйти из системы
/help - Показать помощь`;

    await this.bot.sendMessage(chatId, welcomeMessage);
  }

  private async handleAdminCommand(chatId: number, userId: number) {
    if (!this.bot) return;

    const session = this.adminSessions.get(userId);
    const now = Date.now();

    // Check if user is already authenticated and session is valid
    if (session && session.authenticated && (now - session.timestamp) < this.SESSION_TIMEOUT) {
      await this.sendAdminPanel(chatId, userId);
      return;
    }

    // Request password
    await this.bot.sendMessage(
      chatId,
      "🔐 Для доступа к админ-панели введите пароль:"
    );
  }

  private async handlePasswordAuth(chatId: number, userId: number) {
    if (!this.bot) return;

    // Create authenticated session
    this.adminSessions.set(userId, {
      userId,
      authenticated: true,
      timestamp: Date.now()
    });

    await this.bot.sendMessage(
      chatId,
      "✅ Аутентификация успешна! Открываю админ-панель..."
    );

    await this.sendAdminPanel(chatId, userId);
  }

  private async sendAdminPanel(chatId: number, userId: number) {
    if (!this.bot) return;

    // Update session timestamp
    const session = this.adminSessions.get(userId);
    if (session) {
      session.timestamp = Date.now();
    }

    const adminUrl = `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}/admin-panel`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "🛠️ Открыть админ-панель",
            web_app: { url: adminUrl }
          }
        ],
        [
          {
            text: "👥 Управление персонажами",
            web_app: { url: `${adminUrl}?tab=characters` }
          }
        ],
        [
          {
            text: "🗺️ Управление локациями", 
            web_app: { url: `${adminUrl}?tab=locations` }
          }
        ],
        [
          {
            text: "🤖 Управление NPC",
            web_app: { url: `${adminUrl}?tab=npcs` }
          }
        ],
        [
          {
            text: "👤 Список пользователей",
            web_app: { url: `${adminUrl}?tab=users` }
          }
        ]
      ]
    };

    await this.bot.sendMessage(
      chatId,
      `🛠️ Админ-панель Cats War

Выберите раздел для управления:

👥 Персонажи - редактирование характеристик игроков
🗺️ Локации - управление игровыми зонами  
🤖 NPC - настройка противников
👤 Пользователи - просмотр зарегистрированных игроков

⚠️ Внимание: все изменения применяются немедленно!`,
      { reply_markup: keyboard }
    );
  }

  private async handleLogout(chatId: number, userId: number) {
    if (!this.bot) return;

    this.adminSessions.delete(userId);
    await this.bot.sendMessage(
      chatId,
      "🔓 Вы вышли из админ-панели. Для повторного входа используйте /admin"
    );
  }

  private async handleHelp(chatId: number, userId: number) {
    if (!this.bot) return;

    const helpMessage = `📋 Справка по админ-боту Cats War

🔧 Доступные команды:
/start - Начальное приветствие
/admin - Открыть админ-панель (требует пароль)
/logout - Выйти из админ-сессии
/help - Показать эту справку

🔐 Безопасность:
• Для доступа требуется пароль администратора
• Сессия автоматически истекает через 30 минут
• Все действия логируются

🛠️ Функции админ-панели:
• Редактирование персонажей (статы, уровень, здоровье)
• Управление локациями (координаты, соединения)
• Настройка NPC (характеристики, респавн)
• Просмотр списка пользователей

⚠️ Важно: все изменения применяются к активной игре немедленно!`;

    await this.bot.sendMessage(chatId, helpMessage);
  }

  private async handleUnknownCommand(chatId: number, userId: number) {
    if (!this.bot) return;

    await this.bot.sendMessage(
      chatId,
      "❓ Неизвестная команда. Используйте /help для списка доступных команд."
    );
  }

  // Check if user has valid admin session
  public isAuthenticated(userId: number): boolean {
    const session = this.adminSessions.get(userId);
    if (!session || !session.authenticated) return false;

    const now = Date.now();
    if ((now - session.timestamp) > this.SESSION_TIMEOUT) {
      this.adminSessions.delete(userId);
      return false;
    }

    return true;
  }

  // Clean up expired sessions periodically
  public cleanupSessions() {
    const now = Date.now();
    for (const [userId, session] of this.adminSessions.entries()) {
      if ((now - session.timestamp) > this.SESSION_TIMEOUT) {
        this.adminSessions.delete(userId);
        console.log(`Cleaned up expired admin session for user ${userId}`);
      }
    }
  }

  public async sendNotification(message: string) {
    if (!this.bot) return;

    // Send notifications to all authenticated admins
    for (const [userId, session] of this.adminSessions.entries()) {
      if (this.isAuthenticated(userId)) {
        try {
          await this.bot.sendMessage(userId, `🔔 ${message}`);
        } catch (error) {
          console.error(`Failed to send notification to admin ${userId}:`, error);
        }
      }
    }
  }
}

export const adminBot = new AdminBotService();

// Clean up expired sessions every 10 minutes
setInterval(() => {
  adminBot.cleanupSessions();
}, 10 * 60 * 1000);