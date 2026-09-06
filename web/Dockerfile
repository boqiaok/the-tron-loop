FROM node:24-alpine

RUN corepack enable
WORKDIR /app

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
RUN pnpm install --frozen-lockfile

COPY web web
RUN pnpm --filter web build

WORKDIR /app/web
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "start"]
