import test from 'node:test'
import assert from 'node:assert/strict'
import { createEmailDelivery, EmailDeliveryError, resolveEmailDeliveryConfig } from './email-delivery.js'

test('Resend is preferred over SMTP and reply-to remains optional', async () => {
  let request
  const delivery = createEmailDelivery({
    RESEND_API_KEY: 're_test_key',
    RESEND_FROM: 'CineMind <invite@namtechie.id.vn>',
    MAIL_USERNAME: 'fallback@example.com',
    MAIL_PASSWORD: 'fallback-password',
  }, {
    fetchImpl: async (url, options) => {
      request = { url, options }
      return { ok: true, status: 200, json: async () => ({ id: 'email_123' }) }
    },
    createTransport: () => { throw new Error('SMTP should not be created') },
  })

  assert.equal(delivery.provider, 'resend')
  assert.equal(await delivery.health(), true)
  await delivery.send({ to: 'friend@example.com', subject: 'Invite', text: 'Join us', html: '<p>Join us</p>' })

  assert.equal(request.url, 'https://api.resend.com/emails')
  assert.equal(request.options.headers.Authorization, 'Bearer re_test_key')
  assert.deepEqual(JSON.parse(request.options.body), {
    from: 'CineMind <invite@namtechie.id.vn>',
    to: ['friend@example.com'],
    subject: 'Invite',
    text: 'Join us',
    html: '<p>Join us</p>',
  })
})

test('Resend includes reply-to only when configured', async () => {
  let body
  const delivery = createEmailDelivery({
    RESEND_API_KEY: 're_test_key',
    RESEND_FROM: 'CineMind <invite@namtechie.id.vn>',
    RESEND_REPLY_TO: 'support@namtechie.id.vn',
  }, {
    fetchImpl: async (_url, options) => {
      body = JSON.parse(options.body)
      return { ok: true, status: 200, json: async () => ({ id: 'email_456' }) }
    },
  })

  await delivery.send({ to: 'friend@example.com', subject: 'Invite', text: 'Join', html: '<p>Join</p>' })
  assert.equal(body.reply_to, 'support@namtechie.id.vn')
})

test('Resend API errors are normalized without exposing credentials', async () => {
  const delivery = createEmailDelivery({ RESEND_API_KEY: 'secret-value', RESEND_FROM: 'invite@namtechie.id.vn' }, {
    fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({ message: 'Domain is not verified' }) }),
  })

  await assert.rejects(
    delivery.send({ to: 'friend@example.com', subject: 'Invite', text: 'Join', html: '<p>Join</p>' }),
    (error) => error instanceof EmailDeliveryError
      && error.provider === 'resend'
      && error.status === 403
      && !error.message.includes('secret-value'),
  )
})

test('SMTP remains available as a fallback', () => {
  assert.deepEqual(resolveEmailDeliveryConfig({
    MAIL_USERNAME: 'sender@gmail.com',
    MAIL_PASSWORD: 'app-password',
    MAIL_FROM: 'sender@gmail.com',
    MAIL_FROM_NAME: 'CineMind',
  }), {
    provider: 'smtp',
    from: '"CineMind" <sender@gmail.com>',
    smtp: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: 'sender@gmail.com', pass: 'app-password' },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    },
  })
})
