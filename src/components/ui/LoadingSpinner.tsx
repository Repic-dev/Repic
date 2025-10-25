interface LoadingSpinnerProps {
  message?: string;
  isFullScreen?: boolean;
}

export function LoadingSpinner({ 
  message = '読み込み中', 
  isFullScreen = false 
}: LoadingSpinnerProps) {
  const containerClasses = isFullScreen 
    ? "flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900"
    : "flex items-center justify-center py-20";

  return (
    <div className={containerClasses} role="status" aria-live="polite">
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 opacity-30 blur-xl animate-pulse" />
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-500 border-r-emerald-400 animate-spin" />
            <div className="absolute inset-3 rounded-full bg-white dark:bg-gray-900" />
          </div>
        </div>
        <div className="mt-6 text-gray-600 dark:text-gray-300 text-sm font-medium">
          {message}
          <span className="inline-flex w-8 justify-start ml-1">
            <span className="animate-bounce">.</span>
            <span className="animate-bounce [animation-delay:150ms]">.</span>
            <span className="animate-bounce [animation-delay:300ms]">.</span>
          </span>
        </div>
      </div>
    </div>
  );
}
