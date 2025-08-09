# Этап сборки
FROM node:20-alpine AS builder

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем только файлы, необходимые для установки зависимостей
COPY package.json package-lock.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы проекта
COPY . .

# Собираем проект (если нужно)
RUN npm run build

# Этап выполнения
FROM node:20-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем зависимости и собранный проект из builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Задаем переменные окружения во время сборки
ARG GITLAB_HOST
ARG GITLAB_PRIVATE_TOKEN
ARG WEBHOOK_PORT=3000
ARG WEBHOOK_SECRET_TOKEN

# Сохраняем ARG в ENV для использования в runtime
ENV GITLAB_HOST=$GITLAB_HOST
ENV GITLAB_PRIVATE_TOKEN=$GITLAB_PRIVATE_TOKEN
ENV WEBHOOK_PORT=$WEBHOOK_PORT
ENV WEBHOOK_SECRET_TOKEN=$WEBHOOK_SECRET_TOKEN

# Открываем порт
EXPOSE $WEBHOOK_PORT

# Запускаем приложение
CMD ["npm", "start"]