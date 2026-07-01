interface Props {
  title: string;
  hint?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export function EmptyState({ title, hint, onAction, actionLabel }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-mark">◌</div>
      <div className="title">{title}</div>
      {hint && <div className="hint">{hint}</div>}
      {onAction && actionLabel && (
        <button className="primary" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}
