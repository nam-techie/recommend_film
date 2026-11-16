// Shared by the browser and service. Plans always come from server entitlements.
const reactions = Object.freeze(['heart', 'clap', 'fire'])
const plans = Object.freeze({
  normal: Object.freeze({ plan: 'normal', label: 'Miễn phí', canCreate: false, canSing: false, canDuet: false, reactions }),
  premium: Object.freeze({ plan: 'premium', label: 'CinePass Plus', canCreate: false, canSing: true, canDuet: false, reactions }),
  ultra: Object.freeze({ plan: 'ultra', label: 'CinePass Ultra', canCreate: true, canSing: true, canDuet: true, reactions }),
})
export function karaokeCapabilities(plan) { return plan === 'ultra' ? plans.ultra : plan === 'premium' ? plans.premium : plans.normal }
