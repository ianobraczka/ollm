import { cn } from "@/lib/utils";

type AssistantLoadingIndicatorProps = {
  className?: string;
  compact?: boolean;
  label?: string;
};

export function AssistantLoadingIndicator({
  className,
  compact = false,
  label,
}: AssistantLoadingIndicatorProps) {
  const dotSize = compact ? "h-1.5 w-1.5" : "h-2 w-2";

  return (
    <div
      className={cn("flex items-center gap-2.5", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="flex items-center gap-1">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className={cn(
              "assistant-loading-dot rounded-full bg-current opacity-70",
              dotSize,
            )}
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
      {label && !compact && (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      )}
    </div>
  );
}
