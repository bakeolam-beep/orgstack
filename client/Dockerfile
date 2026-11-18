FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.node.json tsconfig.app.json ./
COPY index.html vite.config.ts tailwind.config.cjs postcss.config.cjs ./
COPY src ./src
COPY public ./public

RUN npm run build

FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY --from=builder /app/dist ./dist
COPY vite.config.ts ./

ENV NODE_ENV=production

EXPOSE 5173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
