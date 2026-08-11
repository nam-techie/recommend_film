import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MembershipBadge } from '@/components/monetization/MembershipBadge'

describe('MembershipBadge', () => {
  it.each([
    ['normal', 'CinePass'],
    ['premium', 'CinePass Plus'],
    ['ultra', 'CinePass Ultra'],
  ] as const)('renders the public label for %s', (plan, label) => {
    render(<MembershipBadge plan={plan} />)
    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByTitle(`Huy hiệu thành viên ${label}`)).toHaveAttribute('data-membership-plan', plan)
  })
})
