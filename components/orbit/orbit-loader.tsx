import { cn } from "@/lib/utils";

type OrbitLoaderProps = {
  label?: string;
  className?: string;
};

export function OrbitLoader({ label, className }: OrbitLoaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        className
      )}
    >
      <div className="relative flex h-10 w-10 items-center justify-center">
        <div className="orbit-loader-orb h-2.5 w-2.5 rounded-full bg-sky-400" />
      </div>
      {label && (
        <p className="orbit-loader-label font-medium text-[10px] text-neutral-400 uppercase tracking-[0.2em]">
          {label}
        </p>
      )}
    </div>
  );
}
