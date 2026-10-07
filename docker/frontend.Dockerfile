FROM node:22-alpine AS build

WORKDIR /app
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json apps/frontend/package.json

RUN corepack enable && pnpm install --filter @arogyaloop/frontend... --frozen-lockfile --allow-build=esbuild

COPY apps/frontend apps/frontend
COPY config config

RUN pnpm --filter @arogyaloop/frontend build

FROM nginx:1.27-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
