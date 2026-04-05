# ddbFlow

A lightweight desktop app for browsing, querying, and exploring your AWS DynamoDB tables.

Built with [Electrobun](https://electrobun.dev), React, and the AWS SDK v3. Runs on Windows, macOS, and Linux.

## Features

- **Table browser** — sidebar lists all tables in a region with search filtering
- **Favorite tables** — star tables you use often; favorites sort to the top with a toggle to show only favorites
- **Scan & Query modes** — full table scans or targeted queries with a single toggle
- **Query builder** — select indexes (table, GSI, LSI), set partition/sort key conditions with 7 sort key operators, and add multiple filter conditions with 11 DynamoDB filter operators
- **Saved queries** — save and reuse query templates across tables
- **Session caching** — scan and query results are cached locally so you can revisit them without re-fetching
- **Data grid** — fast table rendering with column visibility controls, type indicators, and key badges (PK, SK, GSI, LSI)
- **Pagination** — load more results on demand with full session history
- **Settings** — switch AWS regions, configure scan limits, check connection status, and purge cache
- **Cache indicators** — color-coded age badges and bolt icons show which tables have cached data

## Prerequisites

- [Bun](https://bun.sh) (v1.3.11+)
- AWS credentials configured (`~/.aws/credentials`, environment variables, or any method supported by the AWS SDK)

## Getting Started

```bash
# install dependencies
bun install

# run in development mode (Vite HMR + Electrobun)
bun run dev
```

Other scripts:

| Script | Description |
|---|---|
| `bun run dev` | Full dev mode — Vite HMR server + Electrobun app |
| `bun run dev:full` | Bundle + build + Electrobun dev with watch |
| `bun run hmr` | Vite dev server only (port 5173) |
| `bun run bundle:bun` | Bundle the Bun backend |

## Project Structure

```
src/
  shared/          Shared types and schemas between frontend and backend
  bun/             Backend — Electrobun main process, AWS SDK calls, file cache
    services/      DynamoClient, TableService, QueryService, CacheService
  mainview/        Frontend — React + Tailwind
    components/    Reusable UI components
    features/
      sidebar/     Table list and list items
      table-view/  Data grid, query builder, sessions
      settings/    Settings panel
    hooks/         React contexts and custom hooks
    lib/           Cache layer, query expressions, formatting
    theme/         Theme provider and design tokens
```

## Tech Stack

- **[Electrobun](https://electrobun.dev)** — desktop runtime with typed RPC between Bun and the system webview
- **React 19** + **Tailwind CSS 4** — UI
- **@tanstack/react-table** — data grid
- **AWS SDK v3** — DynamoDB client and document client
- **Effect** — typed error handling in the backend service layer
- **Vite 8** — frontend bundling with HMR

## How It Works

The app runs two processes connected via Electrobun's typed RPC:

1. **Bun process** — handles AWS SDK calls (list tables, describe table, scan, query) and manages a local file cache at `~/.ddbflow/cache/`
2. **Webview process** — React UI that communicates with the Bun process over RPC. All state is managed through React contexts with automatic cache persistence.

## License

MIT
