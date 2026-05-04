import { Effect } from "effect";
import {
  GetFunctionCommand,
  ListFunctionsCommand,
  type FunctionConfiguration,
} from "@aws-sdk/client-lambda";
import { LambdaClient } from "./AwsServiceClients";
import { DynamoError, TableNotFoundError } from "shared/errors";
import type { LambdaFunctionInfo } from "shared/schemas";

function toFunctionInfo(fn: FunctionConfiguration): LambdaFunctionInfo {
  const functionName = fn.FunctionName ?? "";
  return {
    functionName,
    functionArn: fn.FunctionArn ?? "",
    runtime: fn.Runtime,
    handler: fn.Handler,
    description: fn.Description,
    memorySize: fn.MemorySize,
    timeout: fn.Timeout,
    lastModified: fn.LastModified,
    codeSize: fn.CodeSize,
    role: fn.Role,
    logGroupName: `/aws/lambda/${functionName}`,
  };
}

export const listFunctions = Effect.gen(function* () {
  const client = yield* LambdaClient;
  const functions: LambdaFunctionInfo[] = [];
  let marker: string | undefined;

  do {
    const result = yield* Effect.tryPromise({
      try: () => client.send(new ListFunctionsCommand({ Marker: marker })),
      catch: (cause) => new DynamoError({ cause }),
    });

    functions.push(...(result.Functions ?? []).map(toFunctionInfo));
    marker = result.NextMarker;
  } while (marker);

  return functions.sort((a, b) => a.functionName.localeCompare(b.functionName));
});

export const describeFunction = (functionName: string) =>
  Effect.gen(function* () {
    const client = yield* LambdaClient;
    const result = yield* Effect.tryPromise({
      try: () => client.send(new GetFunctionCommand({ FunctionName: functionName })),
      catch: (cause) => {
        const err = cause as { name?: string };
        if (err?.name === "ResourceNotFoundException") {
          return new TableNotFoundError({ tableName: functionName });
        }
        return new DynamoError({ cause });
      },
    });

    return toFunctionInfo(result.Configuration ?? { FunctionName: functionName });
  });
