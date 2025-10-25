interface FallbackMessageProps {
  message: string;
}

export function FallbackMessage({ message }: FallbackMessageProps) {
  return (
    <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-yellow-800 dark:text-yellow-300 text-sm">
          {message}
        </p>
      </div>
    </div>
  );
}
