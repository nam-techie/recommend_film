export const FEEDBACK_CATEGORIES = ['movie', 'improvement', 'ui_ux', 'content', 'correction', 'bug', 'other'] as const
export type FeedbackCategory = typeof FEEDBACK_CATEGORIES[number]
export type FeedbackStatus = 'new' | 'triaged' | 'planned' | 'resolved' | 'dismissed'
export type FeedbackPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface UserFeedback {
  id: string
  uid: string
  email: string
  displayName: string
  category: FeedbackCategory
  message: string
  pagePath: string
  viewport: { width: number; height: number; deviceClass: 'mobile' | 'tablet' | 'desktop' }
  appVersion?: string
  screenshot?: { objectPath: string; width: number; height: number; size: number; mime: 'image/webp' }
  status: FeedbackStatus
  priority: FeedbackPriority
  assigneeUid?: string
  adminNote?: string
  publicReply?: string
  requestId: string
  revision: number
  createdAt: number
  updatedAt: number
  resolvedAt?: number
  anonymizedAt?: number
}

export function validFeedbackCategory(value: unknown): value is FeedbackCategory {
  return typeof value === 'string' && (FEEDBACK_CATEGORIES as readonly string[]).includes(value)
}

export function feedbackDeviceClass(width: number): UserFeedback['viewport']['deviceClass'] {
  return width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop'
}
