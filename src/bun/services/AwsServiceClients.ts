import { Context, Effect, Layer } from "effect";
import { LambdaClient as AwsLambdaClient } from "@aws-sdk/client-lambda";
import { CloudWatchLogsClient as AwsCloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import { CredentialsError } from "shared/errors";

export class LambdaClient extends Context.Tag("LambdaClient")<
  LambdaClient,
  AwsLambdaClient
>() {}

export class CloudWatchLogsClient extends Context.Tag("CloudWatchLogsClient")<
  CloudWatchLogsClient,
  AwsCloudWatchLogsClient
>() {}

export interface AwsServiceConfig {
  region?: string;
}

const resolveRegion = (region?: string) =>
  region ??
  process.env.AWS_REGION ??
  process.env.AWS_DEFAULT_REGION ??
  "us-east-1";

export const makeLambdaClientLive = (config: AwsServiceConfig = {}) =>
  Layer.effect(
    LambdaClient,
    Effect.try({
      try: () => new AwsLambdaClient({ region: resolveRegion(config.region) }),
      catch: (cause) => new CredentialsError({ cause }),
    }),
  );

export const makeCloudWatchLogsClientLive = (config: AwsServiceConfig = {}) =>
  Layer.effect(
    CloudWatchLogsClient,
    Effect.try({
      try: () => new AwsCloudWatchLogsClient({ region: resolveRegion(config.region) }),
      catch: (cause) => new CredentialsError({ cause }),
    }),
  );

export const LambdaClientLive = makeLambdaClientLive();
export const CloudWatchLogsClientLive = makeCloudWatchLogsClientLive();
