import type { QueryParams } from "shared/schemas";
import type { QuerySessionMeta } from "./cache-keys";

export type SortKeyOperator = "=" | "<" | "<=" | ">" | ">=" | "begins_with" | "between";

export type FilterOperator =
  | "=" | "<>" | "<" | "<=" | ">" | ">="
  | "begins_with" | "contains" | "between"
  | "attribute_exists" | "attribute_not_exists";

export interface FilterCondition {
  attribute: string;
  operator: FilterOperator;
  value: string;
  value2: string; // for "between"
}

export const FILTER_OPERATORS: { value: FilterOperator; label: string; needsValue: boolean; needsValue2: boolean }[] = [
  { value: "=", label: "=", needsValue: true, needsValue2: false },
  { value: "<>", label: "<>", needsValue: true, needsValue2: false },
  { value: "<", label: "<", needsValue: true, needsValue2: false },
  { value: "<=", label: "<=", needsValue: true, needsValue2: false },
  { value: ">", label: ">", needsValue: true, needsValue2: false },
  { value: ">=", label: ">=", needsValue: true, needsValue2: false },
  { value: "begins_with", label: "begins_with", needsValue: true, needsValue2: false },
  { value: "contains", label: "contains", needsValue: true, needsValue2: false },
  { value: "between", label: "between", needsValue: true, needsValue2: true },
  { value: "attribute_exists", label: "attribute_exists", needsValue: false, needsValue2: false },
  { value: "attribute_not_exists", label: "attribute_not_exists", needsValue: false, needsValue2: false },
];

export function emptyFilterCondition(): FilterCondition {
  return { attribute: "", operator: "=", value: "", value2: "" };
}

export interface QueryFormValues {
  tableName: string;
  indexName?: string;
  pkAttribute: string;
  pkValue: string;
  pkType: "S" | "N" | "B";
  skAttribute?: string;
  skOperator?: SortKeyOperator;
  skValue?: string;
  skValue2?: string; // for "between"
  skType?: "S" | "N" | "B";
  scanIndexForward: boolean;
  limit?: number;
}

function castValue(value: string, type: "S" | "N" | "B"): unknown {
  if (type === "N") return Number(value);
  return value;
}

function castFilterValue(value: string): unknown {
  // Attempt numeric cast if it looks like a number, otherwise keep as string
  const n = Number(value);
  if (value !== "" && !Number.isNaN(n)) return n;
  return value;
}

export function buildFilterExpression(
  conditions: FilterCondition[],
): { filterExpression: string; names: Record<string, string>; values: Record<string, unknown> } | null {
  const parts: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  let idx = 0;
  for (const c of conditions) {
    const i = idx++;
    if (!c.attribute.trim()) continue;

    const nameKey = `#f${i}`;
    names[nameKey] = c.attribute.trim();

    if (c.operator === "attribute_exists") {
      parts.push(`attribute_exists(${nameKey})`);
    } else if (c.operator === "attribute_not_exists") {
      parts.push(`attribute_not_exists(${nameKey})`);
    } else if (c.operator === "begins_with") {
      if (!c.value.trim()) continue;
      values[`:f${i}`] = castFilterValue(c.value.trim());
      parts.push(`begins_with(${nameKey}, :f${i})`);
    } else if (c.operator === "contains") {
      if (!c.value.trim()) continue;
      values[`:f${i}`] = castFilterValue(c.value.trim());
      parts.push(`contains(${nameKey}, :f${i})`);
    } else if (c.operator === "between") {
      if (!c.value.trim() || !c.value2.trim()) continue;
      values[`:f${i}a`] = castFilterValue(c.value.trim());
      values[`:f${i}b`] = castFilterValue(c.value2.trim());
      parts.push(`${nameKey} BETWEEN :f${i}a AND :f${i}b`);
    } else {
      // comparison operators: =, <>, <, <=, >, >=
      if (!c.value.trim()) continue;
      values[`:f${i}`] = castFilterValue(c.value.trim());
      parts.push(`${nameKey} ${c.operator} :f${i}`);
    }
  }

  if (parts.length === 0) return null;

  return {
    filterExpression: parts.join(" AND "),
    names,
    values,
  };
}

export function buildQueryExpression(form: QueryFormValues, filters?: FilterCondition[]): QueryParams {
  const names: Record<string, string> = { "#pk": form.pkAttribute };
  const values: Record<string, unknown> = { ":pk": castValue(form.pkValue, form.pkType) };
  let keyCondition = "#pk = :pk";

  if (form.skAttribute && form.skOperator && form.skValue !== undefined && form.skValue !== "") {
    names["#sk"] = form.skAttribute;
    const skType = form.skType ?? "S";

    if (form.skOperator === "begins_with") {
      values[":sk"] = castValue(form.skValue, skType);
      keyCondition += " AND begins_with(#sk, :sk)";
    } else if (form.skOperator === "between") {
      values[":sk1"] = castValue(form.skValue, skType);
      values[":sk2"] = castValue(form.skValue2 ?? "", skType);
      keyCondition += " AND #sk BETWEEN :sk1 AND :sk2";
    } else {
      values[":sk"] = castValue(form.skValue, skType);
      keyCondition += ` AND #sk ${form.skOperator} :sk`;
    }
  }

  const result: QueryParams = {
    tableName: form.tableName,
    indexName: form.indexName || undefined,
    keyConditionExpression: keyCondition,
    expressionAttributeNames: names,
    expressionAttributeValues: values,
    scanIndexForward: form.scanIndexForward,
    limit: form.limit,
  };

  if (filters && filters.length > 0) {
    const filterResult = buildFilterExpression(filters);
    if (filterResult) {
      result.filterExpression = filterResult.filterExpression;
      Object.assign(result.expressionAttributeNames!, filterResult.names);
      Object.assign(result.expressionAttributeValues!, filterResult.values);
    }
  }

  return result;
}

export function buildSessionMeta(form: QueryFormValues, filters?: FilterCondition[]): QuerySessionMeta {
  const validFilters = filters?.filter((f) => f.attribute.trim()) ?? [];
  return {
    indexName: form.indexName || undefined,
    pkAttribute: form.pkAttribute,
    pkValue: form.pkValue,
    skAttribute: form.skAttribute,
    skOperator: form.skOperator,
    skValue: form.skValue,
    skValue2: form.skValue2,
    direction: form.scanIndexForward ? "asc" : "desc",
    filters: validFilters.length > 0 ? validFilters : undefined,
  };
}

export function formatQueryMeta(meta: QuerySessionMeta): string {
  let summary = `${meta.pkAttribute} = ${meta.pkValue}`;
  if (meta.skAttribute && meta.skOperator && meta.skValue) {
    if (meta.skOperator === "begins_with") {
      summary += `, ${meta.skAttribute} begins_with ${meta.skValue}`;
    } else if (meta.skOperator === "between") {
      summary += `, ${meta.skAttribute} between ${meta.skValue} and ${meta.skValue2}`;
    } else {
      summary += `, ${meta.skAttribute} ${meta.skOperator} ${meta.skValue}`;
    }
  }
  if (meta.filters && meta.filters.length > 0) {
    summary += ` + ${meta.filters.length} filter${meta.filters.length !== 1 ? "s" : ""}`;
  }
  if (meta.indexName) {
    summary += ` (${meta.indexName})`;
  }
  return summary;
}
