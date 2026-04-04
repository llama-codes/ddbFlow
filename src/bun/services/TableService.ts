import { Effect } from "effect";
import {
  ListTablesCommand,
  DescribeTableCommand,
} from "@aws-sdk/client-dynamodb";
import { DynamoClient } from "./DynamoClient";
import { DynamoError, TableNotFoundError } from "shared/errors";
import type {
  TableInfo,
  KeySchemaElement,
  AttributeDefinition,
  GsiInfo,
  LsiInfo,
} from "shared/schemas";

export const listTables = Effect.gen(function* () {
  const client = yield* DynamoClient;
  const regionFn = (client as any).config?.region;
  const region = yield* Effect.tryPromise({
    try: () => typeof regionFn === "function" ? Promise.resolve(regionFn()) : Promise.resolve(regionFn),
    catch: () => new DynamoError({ cause: "failed to resolve region" }),
  });
  console.log("[listTables] resolved region:", region);
  console.log("[listTables] sending ListTablesCommand...");
  const result = yield* Effect.tryPromise({
    try: () =>
      Promise.race([
        client.send(new ListTablesCommand({})),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("ListTablesCommand timed out after 5s")),
            5000,
          ),
        ),
      ]),
    catch: (cause) => {
      console.error("[listTables] error:", String(cause));
      return new DynamoError({ cause });
    },
  });
  console.log("[listTables] result:", result.TableNames);
  return result.TableNames ?? [];
});

export const describeTable = (tableName: string) =>
  Effect.gen(function* () {
    const client = yield* DynamoClient;
    const result = yield* Effect.tryPromise({
      try: () =>
        client.send(new DescribeTableCommand({ TableName: tableName })),
      catch: (cause) => {
        const err = cause as { name?: string };
        if (err?.name === "ResourceNotFoundException") {
          return new TableNotFoundError({ tableName });
        }
        return new DynamoError({ cause });
      },
    });

    const table = result.Table!;

    const keys: KeySchemaElement[] = (table.KeySchema ?? []).map((k) => ({
      attributeName: k.AttributeName!,
      keyType: k.KeyType as "HASH" | "RANGE",
    }));

    const attributes: AttributeDefinition[] = (
      table.AttributeDefinitions ?? []
    ).map((a) => ({
      attributeName: a.AttributeName!,
      attributeType: a.AttributeType as "S" | "N" | "B",
    }));

    const gsis: GsiInfo[] = (table.GlobalSecondaryIndexes ?? []).map((g) => ({
      indexName: g.IndexName!,
      keys: (g.KeySchema ?? []).map((k) => ({
        attributeName: k.AttributeName!,
        keyType: k.KeyType as "HASH" | "RANGE",
      })),
      projectionType: g.Projection?.ProjectionType ?? "ALL",
      itemCount: g.ItemCount ?? 0,
    }));

    const lsis: LsiInfo[] = (table.LocalSecondaryIndexes ?? []).map((l) => ({
      indexName: l.IndexName!,
      keys: (l.KeySchema ?? []).map((k) => ({
        attributeName: k.AttributeName!,
        keyType: k.KeyType as "HASH" | "RANGE",
      })),
      projectionType: l.Projection?.ProjectionType ?? "ALL",
    }));

    const info: TableInfo = {
      name: table.TableName!,
      status: table.TableStatus ?? "UNKNOWN",
      itemCount: table.ItemCount ?? 0,
      sizeBytes: table.TableSizeBytes ?? 0,
      keys,
      attributes,
      gsis,
      lsis,
      billingMode: table.BillingModeSummary?.BillingMode ?? "PROVISIONED",
      createdAt: table.CreationDateTime?.toISOString() ?? "",
    };

    return info;
  });
