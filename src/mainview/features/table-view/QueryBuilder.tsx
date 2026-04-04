import { useState, useMemo, useEffect } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { useTableDataCtx } from "../../hooks/TableDataContext";
import { useQueryDataCtx } from "../../hooks/QueryDataContext";
import { useSettingsCtx } from "../../hooks/SettingsContext";
import { Dropdown } from "../../components/Dropdown";
import { Button } from "../../components/Button";
import { Icon, IconPaths } from "../../components/Icon";
import {
  buildQueryExpression,
  buildSessionMeta,
  type SortKeyOperator,
} from "../../lib/query-expression";
import type { KeySchemaElement } from "shared/schemas";

const SK_OPERATORS: { value: SortKeyOperator; label: string }[] = [
  { value: "=", label: "=" },
  { value: "<", label: "<" },
  { value: "<=", label: "<=" },
  { value: ">", label: ">" },
  { value: ">=", label: ">=" },
  { value: "begins_with", label: "begins_with" },
  { value: "between", label: "between" },
];

interface IndexOption {
  value: string;
  label: string;
  keys: KeySchemaElement[];
}

export function QueryBuilder() {
  const t = useTheme();
  const { tableInfo, selectedTable } = useTableDataCtx();
  const { executeQuery, queryLoading } = useQueryDataCtx();
  const { scanLimit } = useSettingsCtx();

  const [selectedIndex, setSelectedIndex] = useState("");
  const [pkValue, setPkValue] = useState("");
  const [skOperator, setSkOperator] = useState<SortKeyOperator>("=");
  const [skValue, setSkValue] = useState("");
  const [skValue2, setSkValue2] = useState("");
  const [scanIndexForward, setScanIndexForward] = useState(true);

  // Reset form when table changes
  useEffect(() => {
    setSelectedIndex("");
    setPkValue("");
    setSkOperator("=");
    setSkValue("");
    setSkValue2("");
    setScanIndexForward(true);
  }, [selectedTable]);

  const indexOptions = useMemo((): IndexOption[] => {
    if (!tableInfo) return [];
    const options: IndexOption[] = [];

    const pk = tableInfo.keys.find((k) => k.keyType === "HASH");
    const sk = tableInfo.keys.find((k) => k.keyType === "RANGE");
    const tableLabel = `Table (${pk?.attributeName ?? "?"}${sk ? `, ${sk.attributeName}` : ""})`;
    options.push({ value: "", label: tableLabel, keys: tableInfo.keys });

    for (const gsi of tableInfo.gsis) {
      const gsiPk = gsi.keys.find((k) => k.keyType === "HASH");
      const gsiSk = gsi.keys.find((k) => k.keyType === "RANGE");
      const label = `GSI: ${gsi.indexName} (${gsiPk?.attributeName ?? "?"}${gsiSk ? `, ${gsiSk.attributeName}` : ""})`;
      options.push({ value: gsi.indexName, label, keys: gsi.keys });
    }

    for (const lsi of tableInfo.lsis) {
      const lsiPk = lsi.keys.find((k) => k.keyType === "HASH");
      const lsiSk = lsi.keys.find((k) => k.keyType === "RANGE");
      const label = `LSI: ${lsi.indexName} (${lsiPk?.attributeName ?? "?"}${lsiSk ? `, ${lsiSk.attributeName}` : ""})`;
      options.push({ value: lsi.indexName, label, keys: lsi.keys });
    }

    return options;
  }, [tableInfo]);

  const activeIndex = indexOptions.find((o) => o.value === selectedIndex) ?? indexOptions[0];
  const pkKey = activeIndex?.keys.find((k) => k.keyType === "HASH");
  const skKey = activeIndex?.keys.find((k) => k.keyType === "RANGE");

  const pkType = tableInfo?.attributes.find((a) => a.attributeName === pkKey?.attributeName)?.attributeType ?? "S";
  const skType = tableInfo?.attributes.find((a) => a.attributeName === skKey?.attributeName)?.attributeType ?? "S";

  const canExecute = pkValue.trim() !== "" && !queryLoading;

  function handleExecute() {
    if (!canExecute || !selectedTable || !pkKey) return;

    const form = {
      tableName: selectedTable,
      indexName: selectedIndex || undefined,
      pkAttribute: pkKey.attributeName,
      pkValue: pkValue.trim(),
      pkType,
      skAttribute: skKey?.attributeName,
      skOperator: skKey && skValue.trim() ? skOperator : undefined,
      skValue: skKey && skValue.trim() ? skValue.trim() : undefined,
      skValue2: skKey && skOperator === "between" ? skValue2.trim() : undefined,
      skType,
      scanIndexForward,
      limit: scanLimit,
    };

    const params = buildQueryExpression(form);
    const meta = buildSessionMeta(form);
    executeQuery(params, meta);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && canExecute) {
      e.preventDefault();
      handleExecute();
    }
  }

  if (!tableInfo) return null;

  return (
    <div
      className={`px-3 py-2 border-b ${t.border.base} shrink-0 flex flex-col gap-2`}
      onKeyDown={handleKeyDown}
    >
      {/* Row 1: Index selector */}
      <div className="flex items-center gap-2">
        <label className={`text-xs ${t.text.faint} w-12 shrink-0`}>Index</label>
        <Dropdown
          options={indexOptions.map((o) => ({ value: o.value, label: o.label }))}
          value={selectedIndex}
          onChange={(v) => {
            setSelectedIndex(v);
            setPkValue("");
            setSkValue("");
            setSkValue2("");
          }}
          size="sm"
          className="flex-1"
        />
      </div>

      {/* Row 2: Partition key */}
      <div className="flex items-center gap-2">
        <label className={`text-xs ${t.text.faint} w-12 shrink-0`}>PK</label>
        <span className={`text-xs ${t.text.tableKey} shrink-0`}>{pkKey?.attributeName}</span>
        <TypeBadge type={pkType} />
        <span className={`text-xs ${t.text.faint}`}>=</span>
        <input
          type="text"
          value={pkValue}
          onChange={(e) => setPkValue(e.target.value)}
          placeholder={`Enter ${pkType === "N" ? "number" : "value"}…`}
          className={`${t.input.base} rounded px-2 py-1 text-xs flex-1 min-w-0`}
        />
      </div>

      {/* Row 3: Sort key condition (only if index has a range key) */}
      {skKey && (
        <div className="flex items-center gap-2">
          <label className={`text-xs ${t.text.faint} w-12 shrink-0`}>SK</label>
          <span className={`text-xs ${t.text.tableKey} shrink-0`}>{skKey.attributeName}</span>
          <TypeBadge type={skType} />
          <Dropdown
            options={SK_OPERATORS.map((o) => ({ value: o.value, label: o.label }))}
            value={skOperator}
            onChange={(v) => setSkOperator(v as SortKeyOperator)}
            size="sm"
            className="w-28 shrink-0"
          />
          <input
            type="text"
            value={skValue}
            onChange={(e) => setSkValue(e.target.value)}
            placeholder={skOperator === "between" ? "From…" : `Enter ${skType === "N" ? "number" : "value"}…`}
            className={`${t.input.base} rounded px-2 py-1 text-xs flex-1 min-w-0`}
          />
          {skOperator === "between" && (
            <>
              <span className={`text-xs ${t.text.faint}`}>and</span>
              <input
                type="text"
                value={skValue2}
                onChange={(e) => setSkValue2(e.target.value)}
                placeholder="To…"
                className={`${t.input.base} rounded px-2 py-1 text-xs flex-1 min-w-0`}
              />
            </>
          )}
        </div>
      )}

      {/* Row 4: Direction + Execute */}
      <div className="flex items-center gap-2">
        <label className={`text-xs ${t.text.faint} w-12 shrink-0`}>Order</label>
        <button
          type="button"
          className={`text-xs px-2 py-1 rounded cursor-pointer ${
            scanIndexForward
              ? `${t.bg.selectedAccent} ${t.text.brand} border ${t.border.brand}`
              : `${t.bg.elevated} ${t.text.secondary} border ${t.border.muted}`
          }`}
          onClick={() => setScanIndexForward(true)}
        >
          ASC
        </button>
        <button
          type="button"
          className={`text-xs px-2 py-1 rounded cursor-pointer ${
            !scanIndexForward
              ? `${t.bg.selectedAccent} ${t.text.brand} border ${t.border.brand}`
              : `${t.bg.elevated} ${t.text.secondary} border ${t.border.muted}`
          }`}
          onClick={() => setScanIndexForward(false)}
        >
          DESC
        </button>

        <div className="flex-1" />

        <Button.Container
          variant="default"
          onClick={handleExecute}
          disabled={!canExecute}
        >
          <Button.Icon>
            <Icon size={12}>{IconPaths.search}</Icon>
          </Button.Icon>
          <Button.Text>
            {queryLoading ? "Querying…" : "Execute"}
          </Button.Text>
        </Button.Container>
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const t = useTheme();
  return (
    <span className={`text-[9px] px-1 font-mono rounded ${t.text.faint} ${t.bg.elevated} border ${t.border.muted} shrink-0`}>
      {type}
    </span>
  );
}
