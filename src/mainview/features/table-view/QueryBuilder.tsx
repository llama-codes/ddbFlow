import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { useTableDataCtx } from "../../hooks/TableDataContext";
import { useQueryDataCtx } from "../../hooks/QueryDataContext";
import { useSettingsCtx } from "../../hooks/SettingsContext";
import { useSavedQueries } from "../../hooks/useSavedQueries";
import { Dropdown } from "../../components/Dropdown";
import { Button } from "../../components/Button";
import { Icon, IconPaths } from "../../components/Icon";
import { Tooltip } from "../../components/Tooltip";
import {
  buildQueryExpression,
  buildSessionMeta,
  FILTER_OPERATORS,
  emptyFilterCondition,
  type SortKeyOperator,
  type FilterCondition,
  type FilterOperator,
} from "../../lib/query-expression";
import { formatSavedQuerySummary, type SavedQuery } from "../../lib/saved-queries";
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
  const { savedQueries, saveQuery, deleteQuery, getCompatibleIndex } = useSavedQueries(tableInfo);

  const [selectedIndex, setSelectedIndex] = useState("");
  const [pkValue, setPkValue] = useState("");
  const [skOperator, setSkOperator] = useState<SortKeyOperator>("=");
  const [skValue, setSkValue] = useState("");
  const [skValue2, setSkValue2] = useState("");
  const [scanIndexForward, setScanIndexForward] = useState(true);

  // Filter conditions
  const [filters, setFilters] = useState<FilterCondition[]>([]);

  // Save mode state
  const [saveMode, setSaveMode] = useState(false);
  const [saveName, setSaveName] = useState("");
  const saveRef = useRef<HTMLDivElement>(null);

  // Saved queries dropdown state
  const [savedQueriesOpen, setSavedQueriesOpen] = useState(false);
  const savedQueriesRef = useRef<HTMLDivElement>(null);

  // Reset form when table changes
  useEffect(() => {
    setSelectedIndex("");
    setPkValue("");
    setSkOperator("=");
    setSkValue("");
    setSkValue2("");
    setScanIndexForward(true);
    setFilters([]);
    setSaveMode(false);
    setSavedQueriesOpen(false);
  }, [selectedTable]);

  // Outside-click for save mode
  useEffect(() => {
    if (!saveMode) return;
    function handleMouseDown(e: MouseEvent) {
      if (saveRef.current && !saveRef.current.contains(e.target as Node)) {
        setSaveMode(false);
        setSaveName("");
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [saveMode]);

  // Outside-click for saved queries dropdown
  useEffect(() => {
    if (!savedQueriesOpen) return;
    function handleMouseDown(e: MouseEvent) {
      if (savedQueriesRef.current && !savedQueriesRef.current.contains(e.target as Node)) {
        setSavedQueriesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [savedQueriesOpen]);

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

  // Filter helpers
  const updateFilter = useCallback((index: number, patch: Partial<FilterCondition>) => {
    setFilters((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }, []);

  const removeFilter = useCallback((index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  }, []);

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

    const params = buildQueryExpression(form, filters);
    const meta = buildSessionMeta(form, filters);
    executeQuery(params, meta);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && canExecute) {
      e.preventDefault();
      handleExecute();
    }
  }

  function handleSave() {
    const name = saveName.trim();
    if (!name || !pkKey) return;
    const validFilters = filters.filter((f) => f.attribute.trim());
    saveQuery({
      name,
      pkAttribute: pkKey.attributeName,
      pkValue: pkValue.trim() || undefined,
      skAttribute: skKey?.attributeName,
      skOperator: skKey ? skOperator : undefined,
      skValue: skKey && skValue.trim() ? skValue.trim() : undefined,
      skValue2: skKey && skOperator === "between" && skValue2.trim() ? skValue2.trim() : undefined,
      scanIndexForward,
      filters: validFilters.length > 0 ? validFilters : undefined,
    });
    setSaveMode(false);
    setSaveName("");
  }

  function handleLoadQuery(query: SavedQuery) {
    const match = getCompatibleIndex(query.id);
    if (!match) return;
    setSelectedIndex(match.indexValue);
    if (query.skOperator) setSkOperator(query.skOperator);
    setScanIndexForward(query.scanIndexForward);
    setPkValue(query.pkValue ?? "");
    setSkValue(query.skValue ?? "");
    setSkValue2(query.skValue2 ?? "");
    setFilters(query.filters ?? []);
    setSavedQueriesOpen(false);
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

      {/* Filter conditions */}
      {filters.map((filter, idx) => {
        const opMeta = FILTER_OPERATORS.find((o) => o.value === filter.operator);
        return (
          <div key={idx} className="flex items-center gap-2">
            <label className={`text-xs ${t.text.faint} w-12 shrink-0`}>
              {idx === 0 ? "Filter" : ""}
            </label>
            <input
              type="text"
              value={filter.attribute}
              onChange={(e) => updateFilter(idx, { attribute: e.target.value })}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Attribute…"
              className={`${t.input.base} rounded px-2 py-1 text-xs w-28 min-w-0`}
            />
            <Dropdown
              options={FILTER_OPERATORS.map((o) => ({ value: o.value, label: o.label }))}
              value={filter.operator}
              onChange={(v) => updateFilter(idx, { operator: v as FilterOperator })}
              size="sm"
              className="w-36 shrink-0"
            />
            {opMeta?.needsValue && (
              <input
                type="text"
                value={filter.value}
                onChange={(e) => updateFilter(idx, { value: e.target.value })}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={filter.operator === "between" ? "From…" : "Value…"}
                className={`${t.input.base} rounded px-2 py-1 text-xs flex-1 min-w-0`}
              />
            )}
            {opMeta?.needsValue2 && (
              <>
                <span className={`text-xs ${t.text.faint}`}>and</span>
                <input
                  type="text"
                  value={filter.value2}
                  onChange={(e) => updateFilter(idx, { value2: e.target.value })}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="To…"
                  className={`${t.input.base} rounded px-2 py-1 text-xs flex-1 min-w-0`}
                />
              </>
            )}
            {!opMeta?.needsValue && (
              <div className="flex-1" />
            )}
            <button
              type="button"
              className={`p-0.5 ${t.text.faint} hover:${t.text.error} cursor-pointer`}
              onClick={() => removeFilter(idx)}
              title="Remove filter"
            >
              <Icon size={12}>{IconPaths.close}</Icon>
            </button>
          </div>
        );
      })}

      {/* Add filter button row */}
      <div className="flex items-center gap-2">
        <div className="w-12 shrink-0" />
        <button
          type="button"
          className={`flex items-center gap-1 text-xs ${t.text.faint} hover:${t.text.secondary} cursor-pointer`}
          onClick={() => setFilters((prev) => [...prev, emptyFilterCondition()])}
        >
          <Icon size={10}>{IconPaths.plus}</Icon>
          <span>Add filter</span>
        </button>
        {filters.length > 0 && (
          <span className={`text-[10px] ${t.text.faint}`}>
            {filters.length} filter{filters.length !== 1 ? "s" : ""} (AND)
          </span>
        )}
      </div>

      {/* Row 4: Direction + Saved Queries + Save + Execute */}
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

        {/* Saved Queries dropdown */}
        <div className="relative" ref={savedQueriesRef}>
          <Tooltip text="Saved queries" position="top">
            <Button.Container
              variant="ghost"
              onClick={() => savedQueries.length > 0 && setSavedQueriesOpen((o) => !o)}
              disabled={savedQueries.length === 0}
            >
              <Button.Icon>
                <Icon size={12} className={savedQueriesOpen ? t.text.brand : ""}>{IconPaths.bookmark}</Icon>
              </Button.Icon>
              {savedQueries.length > 0 && (
                <span className={`text-xs ${t.text.faint} ml-0.5`}>{savedQueries.length}</span>
              )}
            </Button.Container>
          </Tooltip>

          {savedQueriesOpen && (
            <div
              className={`absolute right-0 bottom-full mb-1 w-72 ${t.bg.elevated} border ${t.border.muted} rounded-md shadow-lg z-50 flex flex-col`}
            >
              <div className={`px-3 py-2 border-b ${t.border.base}`}>
                <span className={`text-xs font-medium ${t.text.secondary}`}>
                  {savedQueries.length} saved quer{savedQueries.length !== 1 ? "ies" : "y"}
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {savedQueries.map((query) => {
                  const compatible = !!getCompatibleIndex(query.id);
                  return (
                    <div
                      key={query.id}
                      className={`flex items-center gap-2 px-3 py-2 text-xs group ${
                        compatible
                          ? `${t.text.secondary} cursor-pointer hover:${t.bg.hover}`
                          : `${t.text.faint} opacity-40 cursor-default`
                      }`}
                      onClick={() => compatible && handleLoadQuery(query)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{query.name}</div>
                        <div className={`${t.text.faint} truncate`}>
                          {formatSavedQuerySummary(query)}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`p-0.5 opacity-0 group-hover:opacity-100 ${t.text.faint} hover:${t.text.error} transition-opacity cursor-pointer`}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteQuery(query.id);
                        }}
                        title="Delete saved query"
                      >
                        <Icon size={12}>{IconPaths.trash}</Icon>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Save button / inline input */}
        <div ref={saveRef}>
          {saveMode ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSave();
                  } else if (e.key === "Escape") {
                    setSaveMode(false);
                    setSaveName("");
                  }
                }}
                placeholder="Query name…"
                autoFocus
                className={`${t.input.base} rounded px-2 py-1 text-xs w-32`}
              />
              <Button.Container
                variant="ghost"
                onClick={handleSave}
                disabled={!saveName.trim()}
              >
                <Button.Text>Save</Button.Text>
              </Button.Container>
            </div>
          ) : (
            <Tooltip text="Save query template" position="top">
              <Button.Container
                variant="ghost"
                onClick={() => {
                  setSaveMode(true);
                  setSaveName("");
                }}
                disabled={!pkKey}
              >
                <Button.Icon>
                  <Icon size={12}>{IconPaths.bookmark}</Icon>
                </Button.Icon>
              </Button.Container>
            </Tooltip>
          )}
        </div>

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
