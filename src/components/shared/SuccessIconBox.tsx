import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SuccessIconBoxProps {
  icon: React.ElementType;
  className?: string;
  size?: "sm" | "md" | "lg";
  rounded?: "full" | "xl" | "lg";
}

export function SuccessIconBox({ 
  icon: Icon, 
  className, 
  size = "md",
  rounded = "xl"
}: SuccessIconBoxProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12"
  };

  const roundedClasses = {
    full: "rounded-full",
    xl: "rounded-xl",
    lg: "rounded-lg"
  };

  return (
    <div 
      className={cn(
        "flex shrink-0 items-center justify-center bg-success/15 text-success ring-1 ring-success/30",
        sizeClasses[size],
        roundedClasses[rounded],
        className
      )}
    >
      <Icon className={size === "sm" ? "h-4 w-4" : size === "md" ? "h-5 w-5" : "h-6 w-6"} />
    </div>
  );
}
