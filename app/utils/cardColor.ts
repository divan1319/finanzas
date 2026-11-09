/** Only card identifiers use a fixed palette; application surfaces follow the theme. */
export function cardColorClass(color?: string | null): string {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500', indigo: 'bg-indigo-500', amber: 'bg-amber-500',
    violet: 'bg-violet-500', purple: 'bg-violet-500', rose: 'bg-rose-500', red: 'bg-rose-500',
    sky: 'bg-sky-500', cyan: 'bg-sky-500', blue: 'bg-sky-500'
  }
  return colors[color || ''] || colors.emerald!
}
