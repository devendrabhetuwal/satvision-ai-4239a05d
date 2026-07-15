import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
  FileSpreadsheet,
  FileJson,
} from "lucide-react";

export type Stats = { min: number; mean: number; max: number };
export type Scene = {
  id: string;
  fileName: string;
  date: string;
  bands: number;
  ndvi: Stats;
  ndwi: Stats;
  ndbi: Stats;
  bbox: [number, number, number, number];
  bboxLatLng: [number, number, number, number] | null;
  epsg?: number | null;
};

export type IndexKey = "ndvi" | "ndwi" | "ndbi";

export const INDEX_META: Record<
  IndexKey,
  { label: string; subtitle: string; color: string }
> = {
  ndvi: { label: "NDVI", subtitle: "Vegetation", color: "#4ade80" },
  ndwi: { label: "NDWI", subtitle: "Water", color: "#38bdf8" },
  ndbi: { label: "NDBI", subtitle: "Built-up", color: "#fbbf24" },
};

export function TimeseriesResults({
  scenes,
  activeIndex,
  onActiveIndexChange,
  onRemoveScene,
  onExportCsv,
  onExportGeoJSON,
  readOnly = false,
}: {
  scenes: Scene[];
  activeIndex: IndexKey;
  onActiveIndexChange: (k: IndexKey) => void;
  onRemoveScene?: (id: string) => void;
  onExportCsv?: () => void;
  onExportGeoJSON?: () => void;
  readOnly?: boolean;
}) {
  const chartData = useMemo(
    () =>
      scenes.map((it) => ({
        date: it.date,
        NDVI: Number(it.ndvi.mean.toFixed(4)),
        NDWI: Number(it.ndwi.mean.toFixed(4)),
        NDBI: Number(it.ndbi.mean.toFixed(4)),
      })),
    [scenes]
  );

  const changes = useMemo(() => {
    const compute = (key: IndexKey) => {
      const vals = scenes.map((it) => it[key].mean);
      if (vals.length < 2) return null;
      const first = vals[0];
      const last = vals[vals.length - 1];
      const delta = last - first;
      const pct = first !== 0 ? (delta / Math.abs(first)) * 100 : null;
      let maxJumpIdx = -1;
      let maxJump = 0;
      for (let i = 1; i < vals.length; i++) {
        const d = Math.abs(vals[i] - vals[i - 1]);
        if (d > maxJump) {
          maxJump = d;
          maxJumpIdx = i;
        }
      }
      return {
        first,
        last,
        delta,
        pct,
        maxJump,
        maxJumpFrom: maxJumpIdx > 0 ? scenes[maxJumpIdx - 1].date : null,
        maxJumpTo: maxJumpIdx > 0 ? scenes[maxJumpIdx].date : null,
      };
    };
    return {
      ndvi: compute("ndvi"),
      ndwi: compute("ndwi"),
      ndbi: compute("ndbi"),
    };
  }, [scenes]);

  const highlightedJump = changes[activeIndex];

  return (
    <>
      <section className="mb-6 grid gap-4 md:grid-cols-3">
        {(Object.keys(INDEX_META) as IndexKey[]).map((key) => (
          <ChangeCard
            key={key}
            index={key}
            active={activeIndex === key}
            onClick={() => onActiveIndexChange(key)}
            change={changes[key]}
          />
        ))}
      </section>

      <section className="glass mb-6 rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2
              className="text-lg font-bold"
              style={{ fontFamily: "Space Grotesk" }}
            >
              Mean index over time
            </h2>
            <p className="text-xs text-muted-foreground">
              Highlighting the largest change in{" "}
              <span
                className="font-semibold"
                style={{ color: INDEX_META[activeIndex].color }}
              >
                {INDEX_META[activeIndex].label}
              </span>
            </p>
          </div>
          <div className="flex gap-1">
            {(Object.keys(INDEX_META) as IndexKey[]).map((key) => (
              <button
                key={key}
                onClick={() => onActiveIndexChange(key)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  activeIndex === key
                    ? "bg-primary text-primary-foreground"
                    : "glass hover:bg-white/5"
                }`}
              >
                {INDEX_META[key].label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.08)"
              />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.6)"
                fontSize={11}
              />
              <YAxis
                stroke="rgba(255,255,255,0.6)"
                fontSize={11}
                domain={[-1, 1]}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(15,15,25,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {highlightedJump?.maxJumpTo && (
                <ReferenceLine
                  x={highlightedJump.maxJumpTo}
                  stroke={INDEX_META[activeIndex].color}
                  strokeDasharray="4 4"
                  label={{
                    value: "Δ max",
                    position: "top",
                    fill: INDEX_META[activeIndex].color,
                    fontSize: 10,
                  }}
                />
              )}
              {(["ndvi", "ndwi", "ndbi"] as const).map((k) => (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={INDEX_META[k].label}
                  stroke={INDEX_META[k].color}
                  strokeWidth={activeIndex === k ? 3 : 1.5}
                  opacity={activeIndex === k ? 1 : 0.35}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="glass rounded-2xl p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3
            className="text-sm font-bold uppercase tracking-wider text-muted-foreground"
            style={{ fontFamily: "Space Grotesk" }}
          >
            Scenes ({scenes.length})
          </h3>
          {!readOnly && (onExportCsv || onExportGeoJSON) && (
            <div className="flex gap-2">
              {onExportCsv && (
                <button
                  onClick={onExportCsv}
                  className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium hover:bg-white/5"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
                </button>
              )}
              {onExportGeoJSON && (
                <button
                  onClick={onExportGeoJSON}
                  className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium hover:bg-white/5"
                >
                  <FileJson className="h-3.5 w-3.5" /> Export GeoJSON
                </button>
              )}
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border/40">
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">File</th>
                <th className="px-3 py-2 text-right">NDVI μ</th>
                <th className="px-3 py-2 text-right">NDWI μ</th>
                <th className="px-3 py-2 text-right">NDBI μ</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {scenes.map((it, i) => {
                const prev = scenes[i - 1];
                const delta = prev
                  ? it[activeIndex].mean - prev[activeIndex].mean
                  : 0;
                return (
                  <tr
                    key={it.id}
                    className="border-b border-border/20 last:border-none"
                  >
                    <td className="px-3 py-2 font-mono">{it.date}</td>
                    <td className="px-3 py-2 truncate">
                      <span className="font-mono">{it.fileName}</span>
                      <span className="ml-2 text-muted-foreground">
                        {it.bands}b
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {it.ndvi.mean.toFixed(3)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {it.ndwi.mean.toFixed(3)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {it.ndbi.mean.toFixed(3)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {prev && (
                        <span
                          className={`mr-3 inline-flex items-center gap-1 font-mono ${
                            delta > 0.02
                              ? "text-emerald-400"
                              : delta < -0.02
                                ? "text-rose-400"
                                : "text-muted-foreground"
                          }`}
                        >
                          {delta > 0.02 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : delta < -0.02 ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                          {(delta >= 0 ? "+" : "") + delta.toFixed(3)}
                        </span>
                      )}
                      {!readOnly && onRemoveScene && (
                        <button
                          onClick={() => onRemoveScene(it.id)}
                          className="text-muted-foreground hover:text-rose-400"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function ChangeCard({
  index,
  active,
  onClick,
  change,
}: {
  index: IndexKey;
  active: boolean;
  onClick: () => void;
  change:
    | {
        first: number;
        last: number;
        delta: number;
        pct: number | null;
        maxJump: number;
        maxJumpFrom: string | null;
        maxJumpTo: string | null;
      }
    | null;
}) {
  const meta = INDEX_META[index];
  const trend = change
    ? change.delta > 0.02
      ? "up"
      : change.delta < -0.02
        ? "down"
        : "flat"
    : "flat";
  const Icon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const color =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
        ? "text-rose-400"
        : "text-muted-foreground";

  return (
    <button
      onClick={onClick}
      className={`glass rounded-2xl p-4 text-left transition ${
        active ? "ring-2 ring-primary" : "hover:bg-white/5"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div
            className="text-sm font-bold"
            style={{ fontFamily: "Space Grotesk", color: meta.color }}
          >
            {meta.label}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {meta.subtitle}
          </div>
        </div>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>

      {change ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${color}`}>
              {(change.delta >= 0 ? "+" : "") + change.delta.toFixed(3)}
            </span>
            {change.pct !== null && (
              <span className="text-xs text-muted-foreground">
                ({(change.pct >= 0 ? "+" : "") + change.pct.toFixed(1)}%)
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {change.first.toFixed(3)} → {change.last.toFixed(3)}
          </div>
          {change.maxJumpFrom && change.maxJumpTo && change.maxJump > 0 && (
            <div className="mt-2 rounded-lg bg-black/30 px-2 py-1 text-[10px] text-muted-foreground">
              Largest step: <span className="font-mono">{change.maxJump.toFixed(3)}</span>{" "}
              between {change.maxJumpFrom} → {change.maxJumpTo}
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Add ≥ 2 scenes to see change.
        </p>
      )}
    </button>
  );
}