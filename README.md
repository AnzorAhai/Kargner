# kargner

**Доска объявлений для посредников (INTERMEDIARY) и мастеров (MASTER)**

Проект реализован на Next.js, Prisma, NextAuth, Tailwind CSS и поддерживает PWA + push-уведомления.

## 🚀 Стек технологий
- Frontend: Next.js (App Router)
- Бекенд: API Routes (Next.js)
- ORM: Prisma
- Аутентификация: NextAuth.js (CredentialsProvider + JWT)
- Стилизация: Tailwind CSS
- PWA: `next-pwa`, сервис-воркер, манифест
- Push-уведомления: `web-push`, хранилище подписок в базе данных

## 📦 Основные сущности и роли
- **User**: мастер или посредник (MASTER / INTERMEDIARY), профиль, баланс, портфолио, рейтинг и т.д.
- **Announcement**: объявление посредника с заголовком, описанием, ценой, статусом, изображением.
- **Bid**: ставка мастера на объявление. При новой/обновлённой ставке посредник получает push-уведомление.
- **Order**: заказ, создаётся посредником на основе выбранной ставки, содержит идентификаторы мастера и посредника, комиссию.
- **PushSubscription**: PWA-подписка для хранения подписок на push-уведомления.

## 📁 Структура проекта
```
/src
  /app           — страницы приложения (App Router)
    /api         — API Routes для CRUD операций и push
    /announcements
    /orders
    /profile
    /login
    /register
  /components    — UI-компоненты (BidForm, OrderCard, ProfileCard, WalletSection, EditProfileForm)
  /lib           — утилиты (Prisma, webpush, auth)
  /types         — типизация общего назначения
/prisma
  schema.prisma  — схема БД и модели
  /migrations    — миграции
/public
  /uploads       — загруженные изображения
  manifest.json  — манифест PWA
  /icons         — иконки приложения
next.config.js  — конфигурация Next.js и PWA

```  

## ⚙️ Установка и настройка

1. Клонировать репозиторий:
   ```bash
   git clone <URL репозитория>
   cd kargner
   ```

2. Установить зависимости:
   ```bash
   npm install
   ```

3. Настроить переменные окружения (создать `.env` на основе `.env.example`):
   ```ini
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
   NEXTAUTH_SECRET="<случайная строка для JWT>"
   VAPID_PUBLIC_KEY="<ваш VAPID_PUBLIC_KEY>"
   VAPID_PRIVATE_KEY="<ваш VAPID_PRIVATE_KEY>"
   ```

4. Применить миграции и сгенерировать клиент Prisma:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

5. Запустить локальный сервер разработки:
   ```bash
   npm run dev
   ```

Application запустится на http://localhost:3000

## 🌐 PWA и push-уведомления
- После запуска приложение автоматически создаст сервис-воркер и подключит манифест.
- Для тестирования push:
  1. Сгенерировать VAPID-ключи командой:
     ```bash
     npx web-push generate-vapid-keys
     ```
  2. Заполнить `VAPID_PUBLIC_KEY` и `VAPID_PRIVATE_KEY` в `.env`.
  3. На клиенте вызвать `navigator.serviceWorker.ready` и отправить запрос на `/api/push/subscribe`.

## 📄 Скрипты
- `npm run dev` — запуск разработки
- `npm run build` — сборка проекта
- `npm run start` — запуск продакшн-сервера
- `npx prisma studio` — интерфейс для работы с базой данных

## 🔮 Дальнейшие планы
- Добавить модуль отзывов и рейтингов
- Реализовать хранение портфолио мастеров с несколькими изображениями
- Подключить оплаты (Stripe)
- Юнит- и e2e-тестирование

## ⚖️ Лицензия
MIT
