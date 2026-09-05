export function Skeleton({ rows = 3 }: { rows?: number | undefined }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <div className="h-14 w-full skeleton" key={index} />
      ))}
    </div>
  );
}
