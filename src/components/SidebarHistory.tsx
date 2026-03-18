type Props = {
  items: Array<{ id: string; title: string }>;
  activeId?: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, nextTitle: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
};

export default function SidebarHistory({
  items,
  activeId,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
}: Props) {
  return (
    <aside className="hidden w-72 flex-col border-r border-zinc-200 bg-white p-4 md:flex">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-zinc-900">History</div>
        <button
          type="button"
          onClick={onNewChat}
          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
        >
          New
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {items.length === 0 ? (
          <div className="text-sm text-zinc-500">No conversations yet.</div>
        ) : (
          items.map((it) => {
            const isActive = activeId === it.id;

            return (
              <div
                key={it.id}
                className={
                  'group flex items-center gap-2 rounded-lg px-2 py-1 ' +
                  (isActive ? 'bg-zinc-100' : 'hover:bg-zinc-50')
                }
              >
                <button
                  type="button"
                  onClick={() => onSelect(it.id)}
                  className="min-w-0 flex-1 truncate rounded-md px-1 py-1 text-left text-sm text-zinc-700"
                  title={it.title}
                >
                  {it.title}
                </button>

                <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => {
                      const next = window.prompt('Rename chat', it.title);
                      if (!next) return;
                      const trimmed = next.trim();
                      if (!trimmed) return;
                      void onRename(it.id, trimmed);
                    }}
                    className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-900 hover:bg-zinc-50"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ok = window.confirm('Delete this chat?');
                      if (!ok) return;
                      void onDelete(it.id);
                    }}
                    className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
