# AGENTS.md

## Project approach

- This is a greenfield project. Do not preserve backward compatibility for code
  or API contracts that have not been released.
- Remove obsolete files, routes, fields, and abstractions instead of adding
  aliases, fallbacks, compatibility layers, or duplicate implementations.
- Before a significant implementation phase, present the proposed files,
  interfaces, and behaviour for review. Wait for confirmation before making
  changes.

## Implementation principles

- Choose the simplest implementation that fully meets the current requirements.
- Avoid speculative abstractions, configuration, infrastructure, and
  indirection.
- Grow the system in vertical layers. Start with the smallest feature that works
  end to end, then add capabilities on top of a working product.
- Never trade a working product for unfinished complexity.
- Keep modules cohesive and concerns clearly separated.
- Do not create empty modules or placeholder architecture for features that are
  not being implemented.
- Make architectural decisions suitable for long-term maintenance. Do not
  introduce temporary implementations that are expected to be replaced later.

## Dependencies

- Prefer established, actively maintained libraries when they reduce complexity
  or improve reliability.
- Use dependencies already installed in the project before adding new packages.
- Check a dependency's current documentation and TypeScript types before
  assuming it lacks a required capability.
- Do not reimplement established functionality without a clear project-specific
  reason.
- Do not introduce Redis, queues, microservices, GraphQL, Kubernetes,
  Elasticsearch, or other infrastructure without a demonstrated requirement.

## Database

- PostgreSQL and TypeORM are the only database stack for this project.
- Use the Data Mapper and Repository patterns. Do not use TypeORM Active Record.
- Keep `synchronize: false` and `migrationsRun: false`.
- Every database schema change must use a reviewed TypeORM migration.
- Generated migrations must be inspected before execution.
- A migration may be replaced while it is uncommitted, only applied to a
  disposable local database, and no business data depends on it.
- Never edit or delete a migration after it has been committed, shared, or
  applied to a persistent environment. Add a new migration instead.
- Use database constraints and indexes for rules that must remain true regardless
  of the application code.

## Project structure

- Keep one repository with root-level `web/` and `server/` applications.
- Do not add an `apps/` directory.
- Keep frontend and backend responsibilities separate.
- Organise code by business domain rather than by technical type at the project
  root.
- Do not duplicate entities, DTOs, configuration, or business rules in multiple
  locations.

## API

- Use NestJS, REST, and Swagger/OpenAPI.
- Keep the public API under `/api/v1`.
- Validate all incoming data through DTOs and the global ValidationPipe.
- Do not expose TypeORM entities as public API contracts.
- Keep controllers focused on HTTP concerns and services focused on business
  logic.
- Use repositories for ordinary persistence and QueryBuilder only when a query
  genuinely requires it.

## Frontend

- Use Next.js App Router, React, TypeScript, Tailwind CSS, and shadcn/ui.
- Prefer Server Components for public data-driven pages.
- Use Client Components only when browser state, events, or interactive APIs
  require them.
- Keep business components separate from generic UI primitives.
- Do not add global state management until there is a demonstrated cross-page
  state requirement.

## Quality

- Preserve existing user changes unless they are explicitly in scope.
- Run formatting, lint, build, and relevant tests after each implementation
  phase.
- Test behaviour and business rules rather than implementation details.
- Verify migrations in both directions when the database contains no business
  data.
- Do not commit or push changes unless explicitly requested.
- Never commit local `.env` files, credentials, tokens, or production secrets.
