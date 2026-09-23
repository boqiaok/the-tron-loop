# The Tron Loop

A weekly guide to events and activities around Hamilton, New Zealand.
Visitors can browse what's on and build a day plan from natural-language
preferences. Administrators manage activities and import them from external
sources such as Eventfinda and Hamilton Libraries.

## Stack

- `web/` — Next.js (App Router), React, Tailwind CSS, shadcn/ui
- `server/` — NestJS REST API under `/api/v1`, Swagger at `/api/docs`
- PostgreSQL with TypeORM migrations

## Getting started

Requirements: Node.js 24, pnpm, Docker.

```bash
pnpm install
docker compose up -d database
cp server/.env.example server/.env
cp web/.env.example web/.env
pnpm migration:run
pnpm seed:dev
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=change-me pnpm admin:create
```

Then run the API and the website in separate terminals:

```bash
pnpm dev:server
pnpm dev:web
```

- Website: http://localhost:3000
- API docs: http://localhost:3001/api/docs

Optional settings in `server/.env`: `GEMINI_API_KEY` enables natural-language
planning, `EVENTFINDA_USERNAME` / `EVENTFINDA_PASSWORD` enable Eventfinda
imports, and `IMPORTS_ENABLED=true` turns on scheduled imports.

To run the full stack in Docker instead, create `server/.env` and run
`docker compose up --build`.

## Checks

```bash
pnpm lint
pnpm test
pnpm build
```

## License

Copyright (C) 2026 Asher Jin.

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License version 3 as published by
the Free Software Foundation. See [LICENSE](LICENSE) for the full text.

Event data imported from third-party sources remains subject to those
sources' own terms and is not covered by this license.
