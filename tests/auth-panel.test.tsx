import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthPanel } from '@/components/auth/AuthPanel'

const auth = vi.hoisted(() => ({
  registerWithEmail: vi.fn(),
  resetPassword: vi.fn(),
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
}))

vi.mock('next/link', () => ({ default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a> }))
vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({
    configured: true,
    loading: false,
    ...auth,
  }),
}))

describe('AuthPanel partial-success flows', () => {
  beforeEach(() => {
    Object.values(auth).forEach((mock) => mock.mockReset())
    window.sessionStorage.clear()
  })

  it('does not invoke the authenticated callback after requesting a password reset', async () => {
    auth.resetPassword.mockResolvedValue(undefined)
    const onAuthenticated = vi.fn()
    render(<AuthPanel onAuthenticated={onAuthenticated} />)

    fireEvent.click(screen.getByRole('button', { name: 'Quên mật khẩu?' }))
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'friend@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi hướng dẫn' }))

    await waitFor(() => expect(auth.resetPassword).toHaveBeenCalledWith('friend@example.com'))
    expect(onAuthenticated).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('hướng dẫn đặt lại mật khẩu đã được gửi')
  })

  it('keeps registration successful when only the verification email fails', async () => {
    auth.registerWithEmail.mockResolvedValue({ user: {}, verificationEmailSent: false })
    const onAuthenticated = vi.fn()
    render(<AuthPanel initialMode="register" onAuthenticated={onAuthenticated} />)

    fireEvent.change(screen.getByLabelText('Tên hiển thị'), { target: { value: 'Nam' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nam@example.com' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'password1' } })
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledTimes(1))
    expect(window.sessionStorage.getItem('cinemind:auth-notice')).toContain('Tài khoản đã được tạo')
  })
})
