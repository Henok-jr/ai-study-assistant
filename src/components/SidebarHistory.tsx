type Props = {
  items: Array<{ id: string; title: string }>;
  activeId?: string;
  onSelect?: (id: string) => void;
  onNewChat?: () => void;
};

export default function SidebarHistory({
  items,
  activeId,
  onSelect,
  onNewChat,
}: Props) {
  return (
    <aside className="hidden w-72 flex-col border-r border-zinc-200 bg-white p-4 md:flex">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-zinc-900">History</div>
        {onNewChat ? (
          <button
            type="button"
            onClick={onNewChat}
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
          >
            New
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        {items.length === 0 ? (
          <div className="text-sm text-zinc-500">No conversations yet.</div>
        ) : (
          items.map((it) => {
            const isActive = activeId === it.id;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onSelect?.(it.id)}
                className={
                  'rounded-lg px-3 py-2 text-left text-sm transition-colors ' +
                  (isActive
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'text-zinc-700 hover:bg-zinc-50')
                }
              >
                {it.title}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
