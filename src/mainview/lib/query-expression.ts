import type { QueryParams } from "shared/schemas";
import type { QuerySessionMeta } from "./cache-keys";

export type SortKeyOperator = "=" | "<" | "<=" | ">" | ">=" | "begins_with" | "between";

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

export function buildQueryExpression(form: QueryFormValues): QueryParams {
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

  return {
    tableName: form.tableName,
    indexName: form.indexName || undefined,
    keyConditionExpression: keyCondition,
    expressionAttributeNames: names,
    expressionAttributeValues: values,
    scanIndexForward: form.scanIndexForward,
    limit: form.limit,
  };
}

export function buildSessionMeta(form: QueryFormValues): QuerySessionMeta {
  return {
    indexName: form.indexName || undefined,
    pkAttribute: form.pkAttribute,
    pkValue: form.pkValue,
    skAttribute: form.skAttribute,
    skOperator: form.skOperator,
    skValue: form.skValue,
    skValue2: form.skValue2,
    direction: form.scanIndexForward ? "asc" : "desc",
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
  if (meta.indexName) {
    summary += ` (${meta.indexName})`;
  }
  return summary;
}
