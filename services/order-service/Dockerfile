FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN npx tsc -p tsconfig.build.json

FROM node:24-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

ENV NODE_ENV=production

EXPOSE 3003

CMD ["node", "dist/main.js"]
