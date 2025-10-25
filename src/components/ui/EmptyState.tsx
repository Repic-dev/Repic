interface EmptyStateProps {
  type: 'no-results' | 'initial';
}

export function EmptyState({ type }: EmptyStateProps) {
  if (type === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-gray-400 mb-4">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          検索結果が見つかりませんでした。
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="text-gray-300 mb-6">
        <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8" strokeWidth="2"/>
          <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <p className="text-gray-400 text-lg">
        キーワードを入力して検索を開始してください。
      </p>
    </div>
  );
}
