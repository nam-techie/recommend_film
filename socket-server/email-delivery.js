import nodemailer from 'nodemailer'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const DEFAULT_TIMEOUT_MS = 10_000

export class EmailDeliveryError extends Error {
  constructor(message, provider, status) {
    super(message)
    this.name = 'EmailDeliveryError'
    this.provider = provider
    this.status = status
  }
}

export function resolveEmailDeliveryConfig(env = process.env) {
  const resendApiKey = String(env.RESEND_API_KEY || '').trim()
  const resendFrom = String(env.RESEND_FROM || '').trim()
  const resendReplyTo = String(env.RESEND_REPLY_TO || '').trim()
  const smtpUsername = String(env.MAIL_USERNAME || '').trim()
  const smtpPassword = String(env.MAIL_PASSWORD || '').trim()
  const smtpFrom = String(env.MAIL_FROM || smtpUsername).trim()

  if (resendApiKey && resendFrom) {
    return {
      provider: 'resend',
      resendApiKey,
      from: resendFrom,
      ...(resendReplyTo ? { replyTo: resendReplyTo } : {}),
    }
  }

  if (smtpUsername && smtpPassword && smtpFrom) {
    return {
      provider: 'smtp',
      from: `"${String(env.MAIL_FROM_NAME || 'CineMind').trim()}" <${smtpFrom}>`,
      smtp: {
        host: String(env.MAIL_HOST || 'smtp.gmail.com').trim(),
        port: Number(env.MAIL_PORT || 587),
        secure: String(env.MAIL_SECURE || 'false').toLowerCase() === 'true',
        auth: { user: smtpUsername, pass: smtpPassword },
        connectionTimeout: 5_000,
        greetingTimeout: 5_000,
        socketTimeout: 10_000,
      },
    }
  }

  return { provider: null }
}

export function createEmailDelivery(env = process.env, dependencies = {}) {
  const config = resolveEmailDeliveryConfig(env)
  const fetchImpl = dependencies.fetchImpl || globalThis.fetch
  const createTransport = dependencies.createTransport || nodemailer.createTransport
  const smtpTransporter = config.provider === 'smtp' ? createTransport(config.smtp) : null

  return {
    provider: config.provider,
    configured: Boolean(config.provider),

    async health() {
      if (config.provider === 'resend') return true
      if (!smtpTransporter) return false
      return smtpTransporter.verify()
    },

    async send({ to, subject, text, html }) {
      if (config.provider === 'resend') {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
        try {
          const response = await fetchImpl(RESEND_ENDPOINT, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${config.resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: config.from,
              to: [to],
              subject,
              text,
              html,
              ...(config.replyTo ? { reply_to: config.replyTo } : {}),
            }),
            signal: controller.signal,
          })
          if (!response.ok) {
            const payload = await response.json().catch(() => ({}))
            const detail = typeof payload?.message === 'string' ? payload.message : `HTTP ${response.status}`
            throw new EmailDeliveryError(`Resend rejected the email: ${detail}`, 'resend', response.status)
          }
          return response.json().catch(() => ({}))
        } catch (error) {
          if (error instanceof EmailDeliveryError) throw error
          const message = error?.name === 'AbortError' ? 'Resend request timed out' : 'Could not reach Resend'
          throw new EmailDeliveryError(message, 'resend')
        } finally {
          clearTimeout(timer)
        }
      }

      if (smtpTransporter) return smtpTransporter.sendMail({ from: config.from, to, subject, text, html })
      throw new EmailDeliveryError('Email delivery is not configured', null)
    },
  }
}
