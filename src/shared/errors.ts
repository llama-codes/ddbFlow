import { Data } from "effect";

export class DynamoError extends Data.TaggedError("DynamoError")<{
  readonly cause: unknown;
}> {}

export class TableNotFoundError extends Data.TaggedError("TableNotFoundError")<{
  readonly tableName: string;
}> {}

export class CredentialsError extends Data.TaggedError("CredentialsError")<{
  readonly cause: unknown;
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string;
}> {}
