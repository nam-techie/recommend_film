const value = (input) => String(input || '').trim()

const serviceAccountShape = (input) => {
  const projectId = value(input?.project_id || input?.projectId)
  const clientEmail = value(input?.client_email || input?.clientEmail)
  const privateKey = value(input?.private_key || input?.privateKey).replace(/\\n/g, '\n')
  if (!projectId || !clientEmail || !privateKey) throw Object.assign(new Error('Firebase service account is missing project_id, client_email, or private_key.'), { code: 'INVALID_SERVICE_ACCOUNT' })
  return { projectId, clientEmail, privateKey }
}

const parseJson = (raw) => {
  const trimmed = value(raw)
  const unwrapped = trimmed.startsWith("'") && trimmed.endsWith("'") ? trimmed.slice(1, -1) : trimmed
  try { return JSON.parse(unwrapped) }
  catch { throw Object.assign(new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.'), { code: 'INVALID_SERVICE_ACCOUNT_JSON' }) }
}

export function firebaseAdminConfig(env = process.env) {
  const inlineJson = value(env.FIREBASE_SERVICE_ACCOUNT_JSON)
  const base64Json = value(env.FIREBASE_SERVICE_ACCOUNT_BASE64)
  const splitValuesPresent = Boolean(value(env.FIREBASE_CLIENT_EMAIL) || value(env.FIREBASE_PRIVATE_KEY))
  let serviceAccount = null
  let credentialSource = null

  if (inlineJson) {
    serviceAccount = serviceAccountShape(parseJson(inlineJson))
    credentialSource = 'inline-json'
  } else if (base64Json) {
    const normalized = base64Json.replace(/\s/g, '')
    if (!normalized || normalized.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
      throw Object.assign(new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is not valid base64.'), { code: 'INVALID_SERVICE_ACCOUNT_BASE64' })
    }
    const decoded = Buffer.from(normalized, 'base64').toString('utf8')
    serviceAccount = serviceAccountShape(parseJson(decoded))
    credentialSource = 'inline-base64'
  } else if (value(env.GOOGLE_APPLICATION_CREDENTIALS)) {
    credentialSource = 'application-default'
  } else if (splitValuesPresent) {
    serviceAccount = serviceAccountShape({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY,
    })
    credentialSource = 'split-variables'
  }

  return {
    credentialSource,
    serviceAccount,
    projectId: serviceAccount?.projectId || value(env.FIREBASE_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    databaseURL: value(env.FIREBASE_DATABASE_URL || env.NEXT_PUBLIC_FIREBASE_DATABASE_URL),
  }
}
