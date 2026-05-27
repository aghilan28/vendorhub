export function OperationalBarChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-40 items-end gap-2">
      {values.map((value, index) => (
        <div className="flex flex-1 items-end" key={`${value}-${index}`}>
          <div className="w-full rounded-t bg-brand/80" style={{ height: `${(value / max) * 100}%` }} />
        </div>
      ))}
    </div>
  );
}
