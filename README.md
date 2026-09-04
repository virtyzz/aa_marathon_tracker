# ArcheAge Marathon Tracker

Русскоязычный сервис для личного учёта заданий «Марафона героев». Каждый Discord-аккаунт видит только своих персонажей, отметки и заметки.

## Запуск

1. Скопируйте `.env.example` в `.env` и заполните Discord OAuth credentials. В Discord Developer Portal укажите callback URL: `http://localhost:3000/api/auth/callback/discord`.
2. Запустите PostgreSQL: `docker compose up -d db`.
3. Установите пакеты: `npm install`.
4. Примените включённую миграцию: `npx prisma migrate deploy`, затем `npm run db:seed`.
5. Запустите сервис: `npm run dev`.

Полный запуск в контейнерах: `docker compose up --build`. Перед этим заполните переменные Discord и `NEXTAUTH_SECRET` в `.env`.

## Администраторы

Укажите Discord ID через запятую в `ADMIN_DISCORD_IDS`. Серверные маршруты `/api/admin/weeks` и `/api/admin/tasks` проверяют это значение на каждом запросе и пишут действия в `AdminAuditLog`.

## Состав

- Next.js + TypeScript, тёмный адаптивный интерфейс;
- Auth.js/NextAuth с единственным Discord Provider;
- PostgreSQL + Prisma: пользователи, сессии, персонажи, недели, задания, снимки заданий, прогресс, заметки и аудит;
- API с Zod-валидацией, проверкой владения персонажем и жёстким недельным лимитом 100 XP;
- seed из 14 заданий и тесты расчёта XP.
