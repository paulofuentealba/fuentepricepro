import * as React from "react";
import { reportGoogleError } from "@/lib/google-error-reporting";

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  label?: string;
};

type State = { hasError: boolean };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
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
          <div className="rounded-md border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
            Data unavailable. Please try again later.
          </div>
        )
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
