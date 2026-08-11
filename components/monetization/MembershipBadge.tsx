import { Clapperboard, Crown, Sparkles, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PLAN_DEFINITIONS, type AccountPlan } from '@/lib/monetization'

const badgeStyles: Record<AccountPlan, { icon: LucideIcon; className: string; iconClassName: string }> = {
  normal: {
    icon: Clapperboard,
    className: 'border-white/10 bg-white/[0.045] text-fg-secondary shadow-sm',
    iconClassName: 'bg-white/[0.07] text-fg-secondary',
  },
  premium: {
    icon: Sparkles,
    className: 'border-accent/35 bg-gradient-to-r from-accent/[0.18] to-accent-strong/[0.08] text-accent-soft shadow-[0_8px_24px_rgba(217,70,239,.12)]',
    iconClassName: 'bg-accent/20 text-accent-soft',
  },
  ultra: {
    icon: Crown,
    className: 'border-rating/35 bg-gradient-to-r from-rating/[0.18] via-rating/[0.08] to-accent/[0.08] text-rating shadow-[0_8px_24px_rgba(250,204,21,.10)]',
    iconClassName: 'bg-rating/15 text-rating',
  },
}

export function MembershipBadge({ plan, compact = false, className }: { plan: AccountPlan; compact?: boolean; className?: string }) {
  const style = badgeStyles[plan]
  const Icon = style.icon
  const label = PLAN_DEFINITIONS[plan].name

  return <span
    data-membership-plan={plan}
    title={`Huy hiệu thành viên ${label}`}
    className={cn(
      'inline-flex w-fit shrink-0 items-center rounded-full border font-bold tracking-wide backdrop-blur-sm',
      compact ? 'gap-1 px-1.5 py-1 text-[10px]' : 'gap-1.5 px-2 py-1 text-[11px]',
      style.className,
      className,
    )}
  >
    <span className={cn('flex shrink-0 items-center justify-center rounded-full', compact ? 'h-4 w-4' : 'h-5 w-5', style.iconClassName)}>
      <Icon aria-hidden className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
    </span>
    <span>{label}</span>
  </span>
}
