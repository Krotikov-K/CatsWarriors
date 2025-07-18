# Руководство по развертыванию Клыки и Клятвы

## Развертывание на GitHub

### 1. Создание репозитория на GitHub

1. Зайдите на [GitHub.com](https://github.com)
2. Нажмите кнопку "New repository" (зеленая кнопка)
3. Введите название репозитория: `fangs-and-oaths`
4. Выберите "Public" для открытого проекта
5. НЕ добавляйте README.md (он уже есть в проекте)
6. Нажмите "Create repository"

### 2. Подключение локального проекта к GitHub

В терминале Replit выполните команды:

```bash
# Инициализация git репозитория
git init

# Добавление всех файлов
git add .

# Первый коммит
git commit -m "Initial commit: Клыки и Клятвы RPG game"

# Добавление удаленного репозитория (замените YOUR_USERNAME на ваш GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/fangs-and-oaths.git

# Отправка на GitHub
git push -u origin main
```

### 3. Настройка для развертывания

После загрузки на GitHub, другие пользователи смогут:

1. Клонировать проект:
```bash
git clone https://github.com/YOUR_USERNAME/fangs-and-oaths.git
cd fangs-and-oaths
```

2. Установить зависимости:
```bash
npm install
```

3. Настроить переменные окружения (создать файл `.env`):
```
DATABASE_URL=postgresql://username:password@localhost:5432/cats_war
TELEGRAM_BOT_TOKEN=ваш_токен_бота
```

4. Инициализировать базу данных:
```bash
npm run db:push
```

5. Запустить проект:
```bash
npm run dev
```

## Развертывание на других платформах

### Replit (текущая платформа)
- Проект уже настроен для Replit
- Автоматическое развертывание через кнопку "Deploy"
- Поддержка PostgreSQL базы данных

### Heroku
1. Создайте приложение на Heroku
2. Добавьте Heroku Postgres addon
3. Настройте переменные окружения в Heroku dashboard
4. Подключите GitHub репозиторий для автодеплоя

### Vercel
1. Импортируйте проект из GitHub
2. Настройте переменные окружения
3. Подключите внешнюю PostgreSQL базу данных
4. Автоматическое развертывание при push в GitHub

### DigitalOcean App Platform
1. Создайте новое приложение
2. Подключите GitHub репозиторий
3. Настройте PostgreSQL базу данных
4. Добавьте переменные окружения

## Необходимые переменные окружения

```
DATABASE_URL=postgresql://...  # Обязательно
TELEGRAM_BOT_TOKEN=...         # Обязательно для Telegram бота
NODE_ENV=production           # Для продакшн режима
```

## Дополнительная настройка

### Создание Telegram бота
1. Найдите @BotFather в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям для создания бота
4. Получите токен и добавьте его в переменные окружения
5. Настройте Web App через команду `/newapp`

### Настройка PostgreSQL
- Для локальной разработки: установите PostgreSQL
- Для облачного развертывания: используйте облачные сервисы
  - Heroku Postgres
  - Supabase
  - PlanetScale
  - Railway

## Обновления проекта

После внесения изменений в код:

```bash
# Добавить изменения
git add .

# Создать коммит с описанием изменений
git commit -m "Описание изменений"

# Отправить на GitHub
git push origin main
```

Платформы с автодеплоем автоматически обновят приложение после push в GitHub.