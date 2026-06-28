# DynamoDB Query Builder - Implementation Plan

## Architectural Decision: Separate useQueryData Hook

After analyzing the codebase thoroughly, the correct approach is to create a parallel useQueryData hook rather than extending useTableData. The reasons:

1. **useTableData is tightly coupled to scan semantics** - its selectTable auto-scans, refreshScan creates new scan sessions, and every piece of state is prefixed with scan. Grafting query state onto it would bloat the hook and entangle two independent workflows.

2. **Scan and Query have different lifecycles** - a scan fires automatically when a table is selected; a query fires only when the user fills in a form and clicks Execute. Mixing these into one hook would require mode-switching logic that leaks into every callback.

3. **Session lists are independent** - scan sessions and query sessions should never intermingle in the dropdown. A separate hook naturally owns its own session list.

4. **The DataGrid, ColumnVisibility, and SearchInput are already decoupled** - they accept items, tableKeys, etc. as props. They do not care whether the data came from a scan or query.

The tradeoff is that MainContent.tsx grows a mode toggle and conditionally pulls from one hook or the other, but this is a small, understandable cost.
---

## File-by-File Implementation Plan

### Phase 1: Cache Infrastructure for Queries

**File: src/mainview/lib/cache-keys.ts (modify)**

Add query-specific cache key factories and a QuerySession type that carries the query parameters used.

Add these constants:
- CACHE_QUERY_PREFIX(t: string) returning ddbflow:query:{t}
- CACHE_QUERY_SESSION(t: string, ts: string) returning ddbflow:query:{t}:{ts}

Add these types:

QuerySession interface with fields: cacheKey, fetchedAt, itemCount, queryParams (of type QuerySessionMeta)

QuerySessionMeta interface with fields: indexName? (undefined means main table), partitionKeyName, partitionKeyValue, sortKeyCondition? (human-readable summary), scanIndexForward

The QuerySessionMeta is stored alongside the result so the sessions dropdown can display what query produced each session.

---

### Phase 2: Expression Builder Utility

**File: src/mainview/lib/query-expression.ts (new file)**

Pure functions extracted from the hook to keep it thin and make expression logic independently testable.

Define a SortKeyOperator type: = | < | <= | > | >= | begins_with | between

Define QueryFormValues interface:
- indexName?: string
- partitionKeyName: string
- partitionKeyValue: string
- partitionKeyType: S | N | B
- sortKeyName?: string
- sortKeyOperator?: SortKeyOperator
- sortKeyValue?: string
- sortKeyValue2?: string (only for between)
- sortKeyType?: S | N | B
- scanIndexForward: boolean

Export buildQueryParams(tableName, form, limit) -> QueryParams:
- Always builds: #pk = :pkval
- For sort key operators (=, <, <=, >, >=): appends AND #sk {op} :skval
- For begins_with: appends AND begins_with(#sk, :skval)
- For between: appends AND #sk BETWEEN :skval AND :skval2
- Always uses #pk/#sk aliases in expressionAttributeNames to avoid reserved word collisions
- Casts values to Number when attributeType is N

Export buildSessionMeta(form) -> QuerySessionMeta:
- Builds a human-readable summary for the sessions list
---

### Phase 3: Query State Management Hook

**File: src/mainview/hooks/useQueryData.ts (new file)**

Parallels useTableData but is query-specific. Does NOT own selectedTable or tableInfo - those remain in useTableData.

Signature: useQueryData(selectedTable, tableInfo, scanLimit)

State:
- queryResult: QueryResult or null
- queryLoading: boolean
- queryError: string or null
- queryCachedAt: string or null
- activeQuerySessionKey: string or null
- querySessions: QuerySession[]
- lastQueryParams: QueryParams or null (needed for pagination)

Key callbacks:

executeQuery(formValues: QueryFormValues):
  Uses buildQueryParams() to construct the QueryParams.
  Calls rpc.request.query(queryParams).
  Stores result in cache under CACHE_QUERY_SESSION(table, ts).
  Also stores the QuerySessionMeta alongside the result.
  Updates querySessions list.
  Saves queryParams (minus exclusiveStartKey) to lastQueryParams for pagination.

loadNextQueryPage():
  Uses lastQueryParams with the current lastEvaluatedKey as exclusiveStartKey.
  Appends next page to current result, updates cache.

loadQuerySession(sessionKey):
  Loads a cached query session.

deleteQuerySession(sessionKey):
  Deletes a cached query session. If active, falls back to newest remaining.

refreshQuerySessionList(tableName):
  Lists all CACHE_QUERY_PREFIX(table) keys.

resetQueryData():
  Clears all query state.

Internal effect on selectedTable change:
- Clears all query state
- Loads existing query sessions from cache for the new table

Returns: All state + all callbacks above.

---

**File: src/mainview/hooks/QueryDataContext.tsx (new file)**

Follows the exact same pattern as TableDataContext.tsx:
- Creates context
- QueryDataProvider component accepts selectedTable, tableInfo, scanLimit as props
- Calls useQueryData internally, provides via context
- useQueryDataCtx() consumer hook
---

### Phase 4: Provider Wiring

**File: src/mainview/App.tsx (modify)**

Add QueryDataProvider inside the existing provider tree via a bridge component.

Add a QueryDataBridge component that sits inside TableDataProvider and reads selectedTable/tableInfo from useTableDataCtx(), then renders QueryDataProvider.

Provider tree becomes:
  SettingsProvider > TablesProvider > TableDataProvider(scanLimit) > QueryDataBridge(scanLimit) > AppLayout

Also update handlePurgeCache in AppLayout to additionally call queryData.resetQueryData().

---

### Phase 5: Query Builder UI

**File: src/mainview/features/table-view/QueryBuilder.tsx (new file)**

A form panel rendered above the DataGrid when in Query mode. Schema-aware.

Props:
- tableInfo: TableInfo
- loading: boolean
- onExecute: (params: QueryFormValues) => void

Internal state (local to form, not in hook):
- selectedIndex: string or undefined (undefined = main table)
- pkValue: string
- skOperator: SortKeyOperator or undefined
- skValue: string
- skValue2: string
- scanIndexForward: boolean (default true)

Layout:
  Index:          [Main Table (pk, sk) dropdown]
  Partition Key:  userId (S)  [text input]
  Sort Key:       timestamp (N)  [operator dropdown] [text input] [2nd input if between]
  Direction:      Ascending/Descending toggle       [Execute Query button]

Index selector logic:
- Main table entry: label shows PK name and SK name (if exists) from tableInfo.keys
- Each GSI: label shows GSI: indexName (pkName, skName) from tableInfo.gsis[].keys
- Each LSI: label shows LSI: indexName (pkName, skName) from tableInfo.lsis[].keys

When index changes:
- Derive the PK attribute name and SK attribute name from the selected index keys
- Look up their types from tableInfo.attributes
- Reset PK/SK values
- If no RANGE key exists on the selected index, hide the sort key row entirely

Execute button disabled when: pkValue is empty or loading is true.

Styling: Uses existing Dropdown, Button, KeyBadge, theme tokens.

Compact design: The panel should be visually compact with a subtle background (t.bg.surfaceDim) and bottom border to separate it from the DataGrid.
---

### Phase 6: MainContent Mode Switching

**File: src/mainview/features/table-view/MainContent.tsx (modify)**

This is the largest change. MainContent gains a mode concept.

Add state: mode as scan or query (default scan)

Import query context: const queryData = useQueryDataCtx()

Add mode toggle in header bar:
A pair of small tab-style buttons (Scan / Query) placed right after the table name h2. The active tab uses t.text.brand + a bottom border accent; the inactive tab uses t.text.muted.

Compute active values based on mode:
- activeResult = scan mode uses scanResult, query mode uses queryData.queryResult
- activeLoading = scan mode uses scanLoading, query mode uses queryData.queryLoading
- activeError = scan mode uses scanError, query mode uses queryData.queryError
- activeCachedAt = scan mode uses scanCachedAt, query mode uses queryData.queryCachedAt
- activeSessions = scan mode uses scanSessions, query mode uses queryData.querySessions
- activeSessionKey = scan mode uses activeScanSessionKey, query mode uses queryData.activeQuerySessionKey

Replace all direct scanResult references with activeResult, etc. This means:
- filteredItems memo uses activeResult?.items
- toggleableColumns memo uses activeResult?.items
- Loading state uses activeLoading
- Error state uses activeError
- Error text says Scan failed or Query failed based on mode

SessionsDropdown wiring uses mode-dependent props for sessions, activeSessionKey, onSelectSession, onDeleteSession.

New session button:
- Scan mode: calls refreshScan (existing behavior)
- Query mode: hidden or disabled if no query has been executed yet

QueryBuilder panel:
- Rendered between the search bar and the DataGrid body, only when mode is query and tableInfo exists
- Pass onExecute, loading, tableInfo

DataGrid props:
- items = filteredItems
- hasNextPage = !!activeResult?.lastEvaluatedKey
- onLoadNextPage = mode-dependent
- loadingNextPage = activeLoading

Mode reset on table change: add setMode(scan) to the existing useEffect([selectedTable]) block.
---

### Phase 7: SessionsDropdown Enhancement

**File: src/mainview/features/table-view/SessionsDropdown.tsx (modify)**

Currently takes ScanSession[]. Generalize to accept either session type.

Use a union type ScanSession | QuerySession. Detect query sessions by checking for the queryParams property.

For QuerySession entries, render a subtitle line below the timestamp showing the query summary (pk=value, sk condition).

For ScanSession entries, keep the existing itemCount display.

---

## Summary of All Files

| File | Action | Description |
|------|--------|-------------|
| src/mainview/lib/cache-keys.ts | Modify | Add CACHE_QUERY_PREFIX, CACHE_QUERY_SESSION, QuerySession, QuerySessionMeta |
| src/mainview/lib/query-expression.ts | Create | buildQueryParams(), buildSessionMeta(), SortKeyOperator, QueryFormValues |
| src/mainview/hooks/useQueryData.ts | Create | Query state management hook parallel to useTableData |
| src/mainview/hooks/QueryDataContext.tsx | Create | React context provider/consumer for query data |
| src/mainview/features/table-view/QueryBuilder.tsx | Create | Schema-aware query builder form UI |
| src/mainview/features/table-view/MainContent.tsx | Modify | Add scan/query mode toggle, wire up query state, show QueryBuilder |
| src/mainview/features/table-view/SessionsDropdown.tsx | Modify | Support QuerySession type with query param display |
| src/mainview/App.tsx | Modify | Add QueryDataProvider via bridge component |

Files NOT modified:
- useTableData.ts - zero changes
- DataGrid.tsx - zero changes (already takes generic props)
- ColumnVisibilityDropdown.tsx - zero changes
- Backend (QueryService.ts, rpc-handlers.ts) - zero changes (already complete)
- schemas.ts, rpc-types.ts - zero changes (already have QueryParams)

---

## Implementation Order

1. Phase 1 - cache-keys.ts additions (~5 min)
2. Phase 2 - query-expression.ts (~15 min)
3. Phase 3 - useQueryData.ts + QueryDataContext.tsx (~30 min)
4. Phase 4 - App.tsx provider wiring (~10 min)
5. Phase 5 - QueryBuilder.tsx (~45 min)
6. Phase 6 - MainContent.tsx modifications (~30 min)
7. Phase 7 - SessionsDropdown.tsx modifications (~15 min)

---

## Edge Cases and Considerations

1. **Reserved word collisions:** Always use #pk / #sk aliases in expressions, never raw attribute names. DynamoDB has ~570 reserved words.

2. **Numeric partition keys:** When attributeType is N, the value must be passed as a number in expressionAttributeValues, not a string. The expression builder handles this.

3. **Binary keys:** Rare. The form shows the input but notes that binary values are entered as base64.

4. **Empty sort key:** If the selected index has no RANGE key, the sort key row is hidden and no sort key condition is added.

5. **GSI with different key types:** Each GSI can have entirely different PK/SK attributes. QueryBuilder looks up attribute types from tableInfo.attributes for the selected index keys.

6. **LSI partition key:** LSIs always share the table partition key. QueryBuilder enforces this by showing the table PK when an LSI is selected.

7. **Projection limitations:** GSI/LSI with KEYS_ONLY or INCLUDE projection will not return all attributes. DataGrid handles this gracefully since it dynamically builds columns.

8. **Mode persistence:** Mode resets to scan on table switch. Not cached.

9. **Cache filesystem:** Query sessions use ddbflow:query:{table}:{ts} which maps to ~/.ddbflow/cache/ddbflow/query/{table}/{ts}.json via existing CacheService.keyToPath(). No backend changes needed.

10. **loadNextQueryPage needs the original QueryParams:** The hook must store the last-used QueryParams (minus exclusiveStartKey) so that pagination can re-issue the same query with the new start key. Store this as lastQueryParams state in the hook.
