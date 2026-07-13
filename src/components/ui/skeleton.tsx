import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-md bg-primary/10", className)}
      {...props}
    >
      <div className="shimmer absolute inset-0" aria-hidden />
    </div>
  );
}

export { Skeleton };
