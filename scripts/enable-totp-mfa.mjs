#!/usr/bin/env node
/**
 * Bật TOTP MFA (Google Authenticator-compatible) một lần cho Firebase project.
 *
 * Chạy: npm.cmd run auth:enable-totp
 *
 * Script chỉ cập nhật cấu hình Firebase Authentication/Identity Platform. Nó
 * không tạo user, không đọc dữ liệu Realtime Database và không liên kết Billing.
 */
import nextEnv from '@next/env'
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd())

function serviceAccountCredential() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  if (json) {
    const parsed = JSON.parse(json)
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON thiếu project_id, client_email hoặc private_key.')
    return cert({
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key.replace(/\\n/g, '\n'),
    })
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (projectId && clientEmail && privateKey) return cert({ projectId, clientEmail, privateKey })
  return applicationDefault()
}

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '(không xác định)'
  const app = getApps()[0] || initializeApp({ credential: serviceAccountCredential(), projectId })

  console.log(`Đang bật TOTP MFA cho Firebase project: ${projectId}`)
  await getAuth(app).projectConfigManager().updateProjectConfig({
    multiFactorConfig: {
      providerConfigs: [{
        state: 'ENABLED',
        // Chấp nhận thêm một ô thời gian 30 giây liền kề để tránh lệch đồng hồ nhỏ.
        totpProviderConfig: { adjacentIntervals: 1 },
      }],
    },
  })
  console.log('✓ Đã bật TOTP MFA. Mở http://localhost:3000/admin/security để quét QR Google Authenticator.')
}

main().catch((error) => {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  console.error(`✗ Không thể bật TOTP MFA${code ? ` (${code})` : ''}.`)
  console.error(error instanceof Error ? error.message : 'Lỗi không xác định.')
  console.error('Kiểm tra Identity Platform đã được nâng cấp và service account trong .env có quyền Firebase Authentication Admin/Owner.')
  process.exitCode = 1
})
