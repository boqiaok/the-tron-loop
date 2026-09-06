FROM node:24-alpine

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
RUN pnpm install --frozen-lockfile

COPY server server
RUN pnpm --filter server build

WORKDIR /app/server
EXPOSE 3001
CMD ["sh", "-c", "pnpm exec typeorm migration:run -d dist/database/data-source.js && node dist/main.js"]
