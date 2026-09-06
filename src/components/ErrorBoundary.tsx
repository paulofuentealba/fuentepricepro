import * as React from "react";
import { reportGoogleError } from "@/lib/google-error-reporting";

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  label?: string;
};

type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[ErrorBoundary caught in ${this.props.label ?? "unknown"}]:`, error, info.componentStack);
    }
    try {
      reportGoogleError(error, {
        boundary: this.props.label ?? "component_error_boundary",
        componentStack: info.componentStack ?? undefined,
      });
    } catch {
      // swallow — never let reporting crash the boundary
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-md border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground space-y-2">
            <div>Data unavailable. Please try again later.</div>
            {process.env.NODE_ENV !== "production" && this.state.error && (
              <pre className="text-xs text-destructive overflow-auto max-h-40 whitespace-pre-wrap font-mono bg-destructive/10 p-2 rounded border border-destructive/20">
                {this.state.error.message}
              </pre>
            )}
          </div>
        )
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
