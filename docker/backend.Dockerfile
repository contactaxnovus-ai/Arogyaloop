FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json

RUN corepack enable && pnpm install --filter @arogyaloop/backend... --frozen-lockfile --prod

COPY apps/backend/src apps/backend/src
COPY apps/backend/data apps/backend/data

USER node
EXPOSE 4000
CMD ["node", "apps/backend/src/server.js"]
