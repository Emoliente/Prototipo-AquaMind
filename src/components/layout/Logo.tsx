import { cn } from '@/lib/cn';

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-9 shrink-0', className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--surface-3)" />
      <path d="M6 12.5c3-2 5-2 8 0s5 2 8 0 4-2 4-2" stroke="var(--accent)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M6 18c3-2 5-2 8 0s5 2 8 0 4-2 4-2" stroke="var(--accent)" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity=".55" />
      <rect x="6" y="22.5" width="20" height="3.5" rx="1.75" fill="var(--sludge-top)" />
    </svg>
  );
}
