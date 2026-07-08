# syntax=docker/dockerfile:1
#
# Builds the PeopleVault frontend from the monorepo root so it can access the
# generated API client workspace package and the OpenAPI spec.
# Build context should be the repo root:
#   docker build -f apps/frontend/Dockerfile -t peoplevault-frontend .

FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable

# Copy workspace manifests first for better layer caching.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/api-client/package.json packages/api-client/
COPY apps/frontend/package.json apps/frontend/

RUN pnpm install --frozen-lockfile || pnpm install

# Copy the rest of the source (openapi spec, api-client src, frontend src).
COPY openapi openapi
COPY packages/api-client packages/api-client
COPY apps/frontend apps/frontend

# Generate API types, build the api-client package, then build the frontend.
RUN pnpm --filter @peoplevault/api-client gen \
 && pnpm --filter @peoplevault/api-client build \
 && pnpm --filter @peoplevault/frontend build

FROM nginx:alpine
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
