FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY index.html vite.config.ts ./
COPY src ./src
COPY public ./public

RUN npm run build

FROM node:24-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

EXPOSE 5173

CMD ["serve", "-s", "dist", "-l", "5173"]
