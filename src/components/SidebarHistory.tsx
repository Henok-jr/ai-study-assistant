type Props = {
  items: Array<{ id: string; title: string }>;
};

export default function SidebarHistory({ items }: Props) {
  return (
    <aside className="hidden w-72 flex-col border-r border-zinc-200 bg-white p-4 md:flex">
      <div className="mb-3 text-sm font-semibold text-zinc-900">History</div>
      <div className="flex flex-col gap-2">
        {items.length === 0 ? (
          <div className="text-sm text-zinc-500">No conversations yet.</div>
        ) : (
          items.map((it) => (
            <button
              key={it.id}
              type="button"
              className="rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
            >
              {it.title}
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
