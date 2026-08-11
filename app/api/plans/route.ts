import { NextResponse } from 'next/server'
import { getEffectivePlanCatalog } from '@/lib/server/plan-catalog'

export const dynamic = 'force-dynamic'

export async function GET() {
  const catalog = await getEffectivePlanCatalog()
  return NextResponse.json({ plans: Object.values(catalog) }, { headers: { 'Cache-Control': 'no-store' } })
}
