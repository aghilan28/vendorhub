"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SimulationParameter } from "@/lib/simulation";

function groupParameters(schema: SimulationParameter[]): Array<{ group: string; params: SimulationParameter[] }> {
  const map = new Map<string, SimulationParameter[]>();
  for (const p of schema) {
    const g = p.group ?? "Parameters";
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(p);
  }
  return [...map.entries()].map(([group, params]) => ({ group, params }));
}

export function ParameterControls({
  schema,
  values,
  onChange,
}: {
  schema: SimulationParameter[];
  values: Record<string, number | string>;
  onChange: (key: string, value: number | string) => void;
}) {
  const groups = groupParameters(schema);

  return (
    <div className="space-y-5">
      {groups.map(({ group, params }) => (
        <div key={group}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary-text">{group}</p>
          <div className="space-y-4">
            {params.map((param) => {
              const value = values[param.key] ?? param.defaultValue;
              if (param.kind === "select") {
                return (
                  <div key={param.key}>
                    <label className="block text-sm font-medium text-primary-text">{param.label}</label>
                    <Select value={String(value)} onValueChange={(v) => onChange(param.key, v)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {param.options?.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-secondary-text">{param.help}</p>
                  </div>
                );
              }

              const numValue = typeof value === "number" ? value : Number(value);
              const hasRange = typeof param.min === "number" && typeof param.max === "number";
              return (
                <div key={param.key}>
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-primary-text" htmlFor={`param-${param.key}`}>
                      {param.label}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        id={`param-${param.key}`}
                        type="number"
                        className="h-9 min-h-9 w-28 text-right"
                        value={Number.isFinite(numValue) ? numValue : 0}
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        onChange={(e) => onChange(param.key, e.target.value === "" ? 0 : Number(e.target.value))}
                      />
                      {param.unit ? <span className="w-10 text-xs text-secondary-text">{param.unit}</span> : <span className="w-10" />}
                    </div>
                  </div>
                  {hasRange ? (
                    <input
                      type="range"
                      aria-label={`${param.label} slider`}
                      className="mt-2 w-full accent-brand"
                      min={param.min}
                      max={param.max}
                      step={param.step}
                      value={Number.isFinite(numValue) ? numValue : param.min}
                      onChange={(e) => onChange(param.key, Number(e.target.value))}
                    />
                  ) : null}
                  <p className="mt-1 text-xs text-secondary-text">{param.help}</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
