# ArcheAge Marathon Tracker

Русскоязычный сервис для личного учёта заданий «Марафона героев». Каждый Discord-аккаунт видит только своих персонажей, отметки и заметки.

## Запуск

1. Скопируйте `.env.example` в серверный `.env` (он игнорируется Git) и заполните Discord OAuth credentials. В Discord Developer Portal укажите callback URL: `${NEXTAUTH_URL}/api/auth/callback/discord` (например `https://aatracker.dayz-map.ru/api/auth/callback/discord`).
2. Запустите PostgreSQL: `docker compose up -d db`.
3. Установите пакеты: `npm install`.
4. Примените включённую миграцию: `npx prisma migrate deploy`, затем `npm run db:seed`.
5. Запустите сервис: `npm run dev`.

Полный запуск в контейнерах: `docker compose up --build`. Контейнер приложения применяет только версионированные миграции (`prisma migrate deploy`), затем безопасно запускает idempotent seed. PostgreSQL не публикует порт наружу; приложение привязано к `127.0.0.1:3100` и должно быть проксировано Nginx-конфигом из `deploy/nginx`.

## Администраторы

Укажите Discord ID через запятую в `ADMIN_DISCORD_IDS`. Серверные маршруты `/api/admin/weeks` и `/api/admin/tasks` проверяют это значение на каждом запросе и пишут действия в `AdminAuditLog`.

## Состав

- Next.js + TypeScript, тёмный адаптивный интерфейс;
- Auth.js/NextAuth с единственным Discord Provider;
- PostgreSQL + Prisma: пользователи, сессии, персонажи, недели, задания, снимки заданий, прогресс, заметки и аудит;
- API с Zod-валидацией, проверкой владения персонажем и жёстким недельным лимитом 100 XP;
- seed из 14 заданий в автоматически вычисленную текущую неделю (четверг–среда), тесты диапазона, XP и правил доступности.

## Эксплуатация

Проверка состояния: `curl http://127.0.0.1:3100/api/health`. Ответ не содержит секретов и показывает только статус БД и факт настройки OAuth-proxy. Для обновления выполните `docker compose up -d --build`; для просмотра логов — `docker compose logs -f app`; для отката используйте предыдущий образ и `docker compose up -d`. Удалять остановленные контейнеры можно командой `docker container prune` после проверки списка. Certbot: на новом сервере проверьте `certbot renew --dry-run`; Nginx оставляет `/.well-known/acme-challenge/` для проверки сертификата, а остальной HTTP трафик перенаправляет на HTTPS.
