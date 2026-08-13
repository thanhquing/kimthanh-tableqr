FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/mock/package.json ./packages/mock/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY tableqr-guest/package.json ./tableqr-guest/package.json
COPY tableqr-staff/package.json ./tableqr-staff/package.json
COPY tableqr-admin/package.json ./tableqr-admin/package.json
RUN pnpm install --frozen-lockfile --filter tableqr-guest... --filter tableqr-staff... --filter tableqr-admin...

COPY packages/contracts ./packages/contracts
COPY packages/mock ./packages/mock
COPY packages/ui ./packages/ui
COPY tableqr-guest ./tableqr-guest
COPY tableqr-staff ./tableqr-staff
COPY tableqr-admin ./tableqr-admin

# Bundle production không bao giờ kèm MSW worker. Caddy phục vụ API cùng origin,
# nên giữ base URL tương đối /api/v1 là chủ đích.
ENV VITE_USE_MOCK=false
ARG VITE_GUEST_BASE_URL=https://guest.tableqr.vn
ENV VITE_GUEST_BASE_URL=$VITE_GUEST_BASE_URL
RUN pnpm --filter @kimthanh-tableqr/contracts build \
  && pnpm --filter @kimthanh-tableqr/mock build \
  && pnpm --filter @kimthanh-tableqr/ui build \
  && pnpm --filter tableqr-guest build \
  && pnpm --filter tableqr-staff build \
  && pnpm --filter tableqr-admin build

FROM caddy:2.8-alpine
COPY infra/production/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/tableqr-admin/dist /srv/admin
COPY --from=build /app/tableqr-staff/dist /srv/staff
COPY --from=build /app/tableqr-guest/dist /srv/guest
