export function ComingSoon({ title, milestone }: { title: string; milestone: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="max-w-md text-sm text-neutral-500 dark:text-neutral-400">
        {title} isn&apos;t built yet — it lands in {milestone}. The rest of LifeOS keeps working in the meantime.
      </p>
    </div>
  );
}
