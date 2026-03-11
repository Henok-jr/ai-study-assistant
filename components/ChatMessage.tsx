type Props = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatMessage({ role, content }: Props) {
  const isUser = role === 'user';

  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={
          'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ' +
          (isUser
            ? 'bg-zinc-900 text-white'
            : 'bg-white text-zinc-900 ring-1 ring-zinc-200')
        }
      >
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  );
}
