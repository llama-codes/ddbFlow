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

export interface TableInfo {
  name: string;
  status: string;
  itemCount: number;
  sizeBytes: number;
  keys: KeySchemaElement[];
  attributes: AttributeDefinition[];
  gsis: GsiInfo[];
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
