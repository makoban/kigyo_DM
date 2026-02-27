interface ProgressBarProps {
  current: number;
  total: number;
  labels?: string[];
}

export function ProgressBar({ current, total, labels }: ProgressBarProps) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">
          ステップ {current} / {total}
        </span>
        <span className="text-sm text-gray-500">{percentage}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-gold-400 progress-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {labels && labels[current - 1] && (
        <p className="mt-2 text-sm text-gold-400 font-medium">
          {labels[current - 1]}
        </p>
      )}
    </div>
  );
}
