FROM node:22-alpine AS build
WORKDIR /app

RUN apk add --no-cache openssl && corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tableqr-api/package.json ./tableqr-api/package.json
RUN pnpm install --frozen-lockfile --filter tableqr-api...

COPY tableqr-api ./tableqr-api
WORKDIR /app/tableqr-api
RUN pnpm prisma:generate
RUN pnpm build

FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/tableqr-api/node_modules ./tableqr-api/node_modules
COPY --from=build /app/tableqr-api/dist ./tableqr-api/dist
COPY --from=build /app/tableqr-api/prisma ./tableqr-api/prisma

WORKDIR /app/tableqr-api
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main.js"]
