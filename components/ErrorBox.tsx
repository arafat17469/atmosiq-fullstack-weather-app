"use client";

interface ErrorBoxProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorBox({ message, onRetry }: ErrorBoxProps) {
  return (
    <div className="error-box flex flex-wrap items-center justify-between gap-3" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn-secondary shrink-0" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
