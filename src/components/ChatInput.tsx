'use client';

import { useState } from 'react';

type Props = {
  onSend: (message: string) => void;
  disabled?: boolean;
  submitOnEnter?: boolean;
};

export default function ChatInput({ onSend, disabled, submitOnEnter = true }: Props) {
  const [value, setValue] = useState('');

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  }

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (!submitOnEnter) return;
          if (e.key !== 'Enter') return;
          if (e.shiftKey) return;
          e.preventDefault();
          if (!disabled) submit();
        }}
        rows={2}
        placeholder="Ask a study question..."
        className="min-h-[44px] flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400"
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={disabled}
        className="h-[44px] rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}
