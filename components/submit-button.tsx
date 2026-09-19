'use client';
import { useFormStatus } from 'react-dom';

export default function SubmitButton({ children, className = 'btn-primary', pendingText }: {
  children: React.ReactNode; className?: string; pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={`${className} ${pending ? 'cursor-wait opacity-70' : ''}`} type="submit" disabled={pending}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {pendingText || 'Saving…'}
        </span>
      ) : children}
    </button>
  );
}
