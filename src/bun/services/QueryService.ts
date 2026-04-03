import { Effect } from "effect";
import { ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoClient } from "./DynamoClient";
import { DynamoError, ValidationError } from "shared/errors";
import type { ScanParams, QueryParams, QueryResult } from "shared/schemas";

export const scan = (params: ScanParams) =>
  Effect.gen(function* () {
    if (!params.tableName) {
      yield* Effect.fail(new ValidationError({ message: "tableName is required" }));
    }

    const client = yield* DynamoClient;
    const result = yield* Effect.tryPromise({
      try: () =>
        client.send(
          new ScanCommand({
            TableName: params.tableName,
            IndexName: params.indexName,
            FilterExpression: params.filterExpression,
            ExpressionAttributeNames: params.expressionAttributeNames,
            ExpressionAttributeValues: params.expressionAttributeValues as Record<string, unknown> | undefined,
            Limit: params.limit,
            ExclusiveStartKey: params.exclusiveStartKey as Record<string, unknown> | undefined,
          })
        ),
      catch: (cause) => new DynamoError({ cause }),
    });

    const queryResult: QueryResult = {
      items: (result.Items ?? []) as Record<string, unknown>[],
      count: result.Count ?? 0,
      scannedCount: result.ScannedCount ?? 0,
      lastEvaluatedKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
    };

    return queryResult;
  });

export const query = (params: QueryParams) =>
  Effect.gen(function* () {
    if (!params.tableName) {
      yield* Effect.fail(new ValidationError({ message: "tableName is required" }));
    }
    if (!params.keyConditionExpression) {
      yield* Effect.fail(
        new ValidationError({ message: "keyConditionExpression is required" })
      );
    }

    const client = yield* DynamoClient;
    const result = yield* Effect.tryPromise({
      try: () =>
        client.send(
          new QueryCommand({
            TableName: params.tableName,
            IndexName: params.indexName,
            KeyConditionExpression: params.keyConditionExpression,
            FilterExpression: params.filterExpression,
            ExpressionAttributeNames: params.expressionAttributeNames,
            ExpressionAttributeValues: params.expressionAttributeValues as Record<string, unknown> | undefined,
            Limit: params.limit,
            ScanIndexForward: params.scanIndexForward ?? true,
            ExclusiveStartKey: params.exclusiveStartKey as Record<string, unknown> | undefined,
          })
        ),
      catch: (cause) => new DynamoError({ cause }),
    });

    const queryResult: QueryResult = {
      items: (result.Items ?? []) as Record<string, unknown>[],
      count: result.Count ?? 0,
      scannedCount: result.ScannedCount ?? 0,
      lastEvaluatedKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
    };

    return queryResult;
  });
