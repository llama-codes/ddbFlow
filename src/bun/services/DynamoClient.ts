import { Context, Effect, Layer } from "effect";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { CredentialsError } from "shared/errors";

export class DynamoClient extends Context.Tag("DynamoClient")<
  DynamoClient,
  DynamoDBDocumentClient
>() {}

export interface DynamoConfig {
  region?: string;
  endpoint?: string;
}

export const makeDynamoClientLive = (config: DynamoConfig = {}) =>
  Layer.effect(
    DynamoClient,
    Effect.try({
      try: () => {
        const raw = new DynamoDBClient({
          region: config.region ?? "us-east-1",
          ...(config.endpoint ? { endpoint: config.endpoint } : {}),
        });
        return DynamoDBDocumentClient.from(raw, {
          marshallOptions: { removeUndefinedValues: true },
        });
      },
      catch: (cause) => new CredentialsError({ cause }),
    })
  );

const defaultConfig: DynamoConfig = {
  region:
    process.env.AWS_REGION ??
    process.env.AWS_DEFAULT_REGION ??
    "us-east-1",
  endpoint: process.env.DYNAMO_ENDPOINT,
};

export const DynamoClientLive = makeDynamoClientLive(defaultConfig);
