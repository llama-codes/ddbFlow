export interface KeySchemaElement {
  attributeName: string;
  keyType: "HASH" | "RANGE";
}

export interface AttributeDefinition {
  attributeName: string;
  attributeType: "S" | "N" | "B";
}

export interface GsiInfo {
  indexName: string;
  keys: KeySchemaElement[];
  projectionType: string;
  itemCount: number;
}

export interface LsiInfo {
  indexName: string;
  keys: KeySchemaElement[];
  projectionType: string;
}

export interface TableInfo {
  name: string;
  status: string;
  itemCount: number;
  sizeBytes: number;
  keys: KeySchemaElement[];
  attributes: AttributeDefinition[];
  gsis: GsiInfo[];
  lsis: LsiInfo[];
  billingMode: string;
  createdAt: string;
}

export interface ScanParams {
  tableName: string;
  indexName?: string;
  filterExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, unknown>;
  limit?: number;
  exclusiveStartKey?: Record<string, unknown>;
}

export interface QueryParams extends ScanParams {
  keyConditionExpression: string;
  scanIndexForward?: boolean;
}

export interface QueryResult {
  items: Record<string, unknown>[];
  count: number;
  scannedCount: number;
  lastEvaluatedKey?: Record<string, unknown>;
}

export type AwsService = "home" | "dynamodb" | "lambda";

export interface LambdaFunctionInfo {
  functionName: string;
  functionArn: string;
  runtime?: string;
  handler?: string;
  description?: string;
  memorySize?: number;
  timeout?: number;
  lastModified?: string;
  codeSize?: number;
  role?: string;
  logGroupName: string;
}

export interface LogFetchParams {
  functionName: string;
  startTime: number;
  endTime: number;
  limit?: number;
  nextToken?: string;
}

export interface LogEvent {
  id: string;
  timestamp: number;
  ingestionTime?: number;
  message: string;
  logStreamName: string;
  requestId?: string;
}

export interface InvocationGroup {
  id: string;
  logStreamName: string;
  requestId?: string;
  startTime: number;
  endTime: number;
  eventCount: number;
}

export interface LogFetchResult {
  events: LogEvent[];
  groups: InvocationGroup[];
  nextToken?: string;
}
