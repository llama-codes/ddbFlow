# DynamoDB Explorer — Project Plan

## Overview

A lightweight desktop app for browsing and querying DynamoDB tables.
Think mini-Dynobase, built with Electrobun + React + Effect.

---

## Stack

| Layer            | Technology                          | Why                                      |
|------------------|-------------------------------------|------------------------------------------|
| Desktop shell    | Electrobun                          | Tiny bundle, system webview, typed RPC   |
| Bundler / dev    | Vite                                | HMR, fast builds, React plugin           |
| UI framework     | React                               | Component model, ecosystem               |
| Data table       | TanStack Table                      | Headless, sortable, filterable, virtual   |
| Backend runtime  | Bun (Electrobun main process)       | Direct filesystem + AWS SDK access       |
| Effect system    | Effect                              | Typed errors, services/layers, Schema, retry |
| AWS access       | @aws-sdk/client-dynamodb + lib-dynamodb | Scan, Query, Describe, unmarshall     |
| Styling          | Tailwind CSS                        | Utility-first, fast iteration            |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Electrobun App                                     │
│                                                     │
│  ┌──────────────────┐   Typed   ┌────────────────┐  │
│  │  Webview          │   RPC    │  Bun process    │  │
│  │                  │◄────────►│                 │  │
│  │  Vite + React    │          │  Effect layers  │  │
│  │  TanStack Table  │          │  AWS SDK v3     │  │
│  │  Tailwind        │          │  ~/.aws/creds   │  │
│  └──────────────────┘          └───────┬─────────┘  │
│                                        │            │
└────────────────────────────────────────┼────────────┘
                                         │
                                    ┌────▼────┐
                                    │ DynamoDB │
                                    └─────────┘
```

---

## Project Structure

```
dynamo-explorer/
├── electrobun.config.ts          # App metadata, build config
├── package.json
├── tsconfig.json
├── tailwind.config.ts
│
├── src/
│   ├── shared/
│   │   ├── rpc-types.ts          # RPCSchema type (shared contract)
│   │   ├── schemas.ts            # Effect Schema definitions (shared)
│   │   └── errors.ts             # Typed error classes
│   │
│   ├── bun/                      # Main process (runs in Bun)
│   │   ├── index.ts              # App entry: window creation, RPC wiring
│   │   ├── services/
│   │   │   ├── DynamoClient.ts   # Effect Layer: DynamoDB client config
│   │   │   ├── TableService.ts   # Effect service: list, describe
│   │   │   └── QueryService.ts   # Effect service: scan, query
│   │   └── rpc-handlers.ts       # Bridge: RPC → Effect programs → response
│   │
│   └── mainview/                 # Webview (runs in browser context)
│       ├── index.html
│       ├── index.tsx             # React root + Electroview RPC setup
│       ├── index.css             # Tailwind entry
│       ├── App.tsx               # Main layout (sidebar + content)
│       ├── hooks/
│       │   ├── useRpc.ts         # Typed hook wrapping electroview.rpc
│       │   ├── useTables.ts      # Table list state
│       │   └── useQuery.ts       # Query/scan execution + result state
│       ├── components/
│       │   ├── Sidebar.tsx       # Table list + connection status
│       │   ├── TableInfo.tsx     # Table metadata (keys, GSIs, counts)
│       │   ├── QueryBuilder.tsx  # Scan/Query form with expression inputs
│       │   ├── ResultsTable.tsx  # TanStack Table with sort/filter/expand
│       │   ├── CellRenderer.tsx  # Type-aware value display
│       │   └── JsonViewer.tsx    # Expanded row JSON view
│       └── lib/
│           └── rpc-client.ts     # Electroview RPC init + typed caller
```

---

## Milestones

### M0 — Scaffold (day 1)

- [ ] `bunx electrobun init` with React + Vite + Tailwind template
- [ ] Verify `bun run dev` opens a window with HMR working
- [ ] Add dependencies: `effect`, `@aws-sdk/client-dynamodb`,
      `@aws-sdk/lib-dynamodb`, `@tanstack/react-table`
- [ ] Set up shared RPC type file with a single ping/pong to prove the bridge works

### M1 — Bun process: DynamoDB via Effect (days 2–3)

Build the backend as Effect services. Each service is a Layer that can be
composed and tested independently.

**DynamoClient layer**

```typescript
// src/bun/services/DynamoClient.ts
import { Effect, Layer, Context } from "effect"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"

class DynamoClient extends Context.Tag("DynamoClient")<
  DynamoClient,
  DynamoDBDocumentClient
>() {}

// Config read from env or defaults
const make = Effect.sync(() => {
  const raw = new DynamoDBClient({
    region: process.env.AWS_REGION ?? "us-east-1",
    ...(process.env.DYNAMO_ENDPOINT
      ? { endpoint: process.env.DYNAMO_ENDPOINT }
      : {}),
  })
  return DynamoDBDocumentClient.from(raw)
})

const DynamoClientLive = Layer.effect(DynamoClient, make)
```

**TableService**

```typescript
// src/bun/services/TableService.ts
import { Effect } from "effect"
import { ListTablesCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb"

const listTables = Effect.gen(function* () {
  const client = yield* DynamoClient
  const result = yield* Effect.tryPromise({
    try: () => client.send(new ListTablesCommand({})),
    catch: (e) => new DynamoError({ cause: e }),
  })
  return result.TableNames ?? []
})

const describeTable = (name: string) => Effect.gen(function* () {
  const client = yield* DynamoClient
  const result = yield* Effect.tryPromise({
    try: () => client.send(new DescribeTableCommand({ TableName: name })),
    catch: (e) => new DynamoError({ cause: e }),
  })
  // Transform to our TableInfo schema
  return parseTableInfo(result.Table)
})
```

**QueryService**

```typescript
// src/bun/services/QueryService.ts
import { ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb"

const scan = (params: ScanParams) => Effect.gen(function* () {
  const client = yield* DynamoClient
  const result = yield* Effect.tryPromise({
    try: () => client.send(new ScanCommand({
      TableName: params.table,
      Limit: params.limit ?? 50,
      FilterExpression: params.filterExpression || undefined,
      ExpressionAttributeValues: params.expressionValues || undefined,
      ExpressionAttributeNames: params.expressionNames || undefined,
    })),
    catch: (e) => new DynamoError({ cause: e }),
  })
  return {
    items: result.Items ?? [],
    count: result.Count ?? 0,
    scannedCount: result.ScannedCount ?? 0,
    hasMore: !!result.LastEvaluatedKey,
  }
})

const query = (params: QueryParams) => Effect.gen(function* () {
  const client = yield* DynamoClient
  const result = yield* Effect.tryPromise({
    try: () => client.send(new QueryCommand({
      TableName: params.table,
      IndexName: params.indexName || undefined,
      KeyConditionExpression: params.keyCondition,
      FilterExpression: params.filterExpression || undefined,
      ExpressionAttributeValues: params.expressionValues || undefined,
      ExpressionAttributeNames: params.expressionNames || undefined,
      Limit: params.limit ?? 50,
      ScanIndexForward: params.scanForward ?? true,
    })),
    catch: (e) => new DynamoError({ cause: e }),
  })
  return {
    items: result.Items ?? [],
    count: result.Count ?? 0,
    scannedCount: result.ScannedCount ?? 0,
    hasMore: !!result.LastEvaluatedKey,
  }
})
```

- [ ] DynamoClient layer (region, endpoint, credentials from env/~/.aws)
- [ ] TableService: `listTables`, `describeTable`
- [ ] QueryService: `scan`, `query`
- [ ] Typed errors: `DynamoError`, `TableNotFoundError`, `CredentialsError`
- [ ] Test with DynamoDB Local via Docker

### M2 — Shared types + RPC bridge (day 3)

Wire the Effect services to Electrobun's typed RPC.

**Shared RPC type contract**

```typescript
// src/shared/rpc-types.ts
import type { RPCSchema } from "electrobun/bun"

export type ExplorerRPC = {
  bun: RPCSchema<{
    requests: {
      listTables:    { params: {};                    response: string[] }
      describeTable: { params: { table: string };     response: TableInfo }
      scan:          { params: ScanParams;            response: QueryResult }
      query:         { params: QueryParams;           response: QueryResult }
    }
    messages: {
      log: { msg: string }
    }
  }>
  webview: RPCSchema<{
    requests: {}
    messages: {
      connectionStatus: { connected: boolean; region: string }
    }
  }>
}
```

**RPC handlers (bridges RPC → Effect)**

```typescript
// src/bun/rpc-handlers.ts
import { BrowserView } from "electrobun/bun"
import { Effect } from "effect"
import type { ExplorerRPC } from "../shared/rpc-types"

const runEffect = <A, E>(effect: Effect.Effect<A, E, DynamoClient>) =>
  Effect.runPromise(effect.pipe(Effect.provide(DynamoClientLive)))

export const explorerRPC = BrowserView.defineRPC<ExplorerRPC>({
  handlers: {
    requests: {
      listTables: () => runEffect(TableService.listTables),
      describeTable: ({ table }) => runEffect(TableService.describeTable(table)),
      scan: (params) => runEffect(QueryService.scan(params)),
      query: (params) => runEffect(QueryService.query(params)),
    },
    messages: {
      log: ({ msg }) => console.log("[webview]", msg),
    },
  },
})
```

- [ ] Define shared RPC type in `src/shared/rpc-types.ts`
- [ ] Define shared Effect Schemas for params/responses in `src/shared/schemas.ts`
- [ ] Wire RPC handlers in bun process (RPC → Effect → response)
- [ ] Verify round-trip: webview calls `listTables`, sees result in console

### M3 — Webview: React UI (days 4–6)

**RPC client hook**

```typescript
// src/mainview/hooks/useRpc.ts
import { Electroview } from "electrobun/view"
import type { ExplorerRPC } from "../../shared/rpc-types"

// Initialized once in index.tsx, exported for hooks
export const electroview = new Electroview<ExplorerRPC>({ rpc })

// Typed wrapper
export function useRpcRequest() {
  return electroview.rpc.request
}
```

**Component breakdown**

```
┌─────────────────────────────────────────────────┐
│ App.tsx                                         │
│ ┌────────────┐ ┌──────────────────────────────┐ │
│ │ Sidebar    │ │ Main content                 │ │
│ │            │ │ ┌──────────────────────────┐  │ │
│ │ • TableA   │ │ │ TableInfo (keys, GSIs)   │  │ │
│ │ • TableB ← │ │ └──────────────────────────┘  │ │
│ │ • TableC   │ │ ┌──────────────────────────┐  │ │
│ │            │ │ │ QueryBuilder             │  │ │
│ │ [refresh]  │ │ │ [Scan] [Query] tabs      │  │ │
│ │ [settings] │ │ │ expressions, limit, GSI  │  │ │
│ │            │ │ └──────────────────────────┘  │ │
│ │            │ │ ┌──────────────────────────┐  │ │
│ │            │ │ │ ResultsTable             │  │ │
│ │            │ │ │ TanStack Table           │  │ │
│ │            │ │ │ sort, filter, expand row │  │ │
│ │            │ │ └──────────────────────────┘  │ │
│ └────────────┘ └──────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

- [ ] `Sidebar.tsx` — table list, connection indicator, refresh
- [ ] `TableInfo.tsx` — key schema, GSIs, item count, size
- [ ] `QueryBuilder.tsx` — scan/query toggle, expression inputs,
      GSI selector, limit, sort direction
- [ ] `ResultsTable.tsx` — TanStack Table with:
  - Dynamic columns from result keys (key columns first)
  - Column sorting
  - Client-side text search filter
  - Click row to expand JSON
- [ ] `CellRenderer.tsx` — color-coded by type (string, number, bool, null, map, list)
- [ ] `JsonViewer.tsx` — pretty-printed JSON for expanded rows

### M4 — Polish + DX (day 7)

- [ ] Error display: Effect errors surface as toast/banner in UI
- [ ] Loading states on all async operations
- [ ] Keyboard shortcuts (Cmd+R to re-run, Cmd+L to focus filter)
- [ ] Persist last connection config (region/endpoint) via Bun filesystem
- [ ] Support DynamoDB Local toggle (endpoint override)
- [ ] Dark/light theme (follow system)

---

## Shared Schemas (Effect)

```typescript
// src/shared/schemas.ts
import { Schema } from "effect"

export const ScanParams = Schema.Struct({
  table: Schema.String,
  limit: Schema.optional(Schema.Number).pipe(Schema.withDefault(() => 50)),
  filterExpression: Schema.optional(Schema.String),
  expressionValues: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
  expressionNames: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
})

export const QueryParams = Schema.Struct({
  table: Schema.String,
  keyCondition: Schema.String,
  indexName: Schema.optional(Schema.String),
  filterExpression: Schema.optional(Schema.String),
  expressionValues: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
  expressionNames: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
  limit: Schema.optional(Schema.Number).pipe(Schema.withDefault(() => 50)),
  scanForward: Schema.optional(Schema.Boolean).pipe(Schema.withDefault(() => true)),
})

export const TableKeySchema = Schema.Struct({
  name: Schema.String,
  type: Schema.Literal("HASH", "RANGE"),
})

export const GSI = Schema.Struct({
  name: Schema.String,
  keys: Schema.Array(TableKeySchema),
})

export const TableInfo = Schema.Struct({
  name: Schema.String,
  status: Schema.String,
  itemCount: Schema.Number,
  sizeBytes: Schema.Number,
  keys: Schema.Array(TableKeySchema),
  attributes: Schema.Array(Schema.Struct({ name: Schema.String, type: Schema.String })),
  gsis: Schema.Array(GSI),
})

export const QueryResult = Schema.Struct({
  items: Schema.Array(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  count: Schema.Number,
  scannedCount: Schema.Number,
  hasMore: Schema.Boolean,
})
```

---

## Typed Errors

```typescript
// src/shared/errors.ts
import { Data } from "effect"

export class DynamoError extends Data.TaggedError("DynamoError")<{
  readonly cause: unknown
}> {}

export class TableNotFoundError extends Data.TaggedError("TableNotFoundError")<{
  readonly table: string
}> {}

export class CredentialsError extends Data.TaggedError("CredentialsError")<{
  readonly message: string
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string
}> {}
```

---

## Dev Workflow

```bash
# Prerequisites
bun install electrobun
docker run -p 8000:8000 amazon/dynamodb-local   # optional

# Development
bun run dev          # Electrobun dev mode with HMR

# Environment
export AWS_REGION=us-east-1
export DYNAMO_ENDPOINT=http://localhost:8000     # for local
```

---

## Future Ideas (not in scope for v1)

- Item editing (PUT/DELETE)
- Batch operations
- PartiQL query support
- Export to CSV/JSON
- Multiple AWS profile switching
- Pagination with ExclusiveStartKey cursor
- Query history / saved queries
- Table creation / management
