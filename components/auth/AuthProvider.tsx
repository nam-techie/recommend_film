'use client'

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Auth, User } from 'firebase/auth'

type AuthApi = typeof import('firebase/auth')
type AccountApi = typeof import('@/lib/account-service')

interface FirebaseRuntime {
  auth: Auth | null
  configured: boolean
  authApi: AuthApi
  accountApi: AccountApi
}

let firebaseRuntime: Promise<FirebaseRuntime> | null = null

function loadFirebaseRuntime() {
  if (!firebaseRuntime) {
    firebaseRuntime = Promise.all([
      import('@/lib/firebase'),
      import('firebase/auth'),
      import('@/lib/account-service'),
    ]).then(([firebase, authApi, accountApi]) => ({ auth: firebase.auth, configured: firebase.firebaseAuthConfigured, authApi, accountApi }))
  }
  return firebaseRuntime
}

export function firebaseAuthError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  const messages: Record<string, string> = {
    'auth/configuration-not-found': 'Dịch vụ đăng nhập tạm thời không khả dụng. Vui lòng quay lại sau.',
    'auth/operation-not-allowed': 'Phương thức đăng nhập này chưa được kích hoạt. Vui lòng quay lại sau.',
    'auth/unauthorized-domain': 'Ứng dụng không được cấp quyền đăng nhập từ địa chỉ này.',
    'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập Google.',
    'auth/popup-blocked': 'Trình duyệt đang chặn cửa sổ đăng nhập. Hãy cho phép popup và thử lại.',
    'auth/cancelled-popup-request': 'Yêu cầu đăng nhập Google trước đó đã bị hủy. Hãy thử lại.',
    'auth/account-exists-with-different-credential': 'Email này đã đăng ký bằng phương thức khác. Hãy đăng nhập bằng email/mật khẩu trước.',
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
    'auth/invalid-login-credentials': 'Email hoặc mật khẩu không đúng.',
    'auth/email-already-in-use': 'Email này đã được đăng ký.',
    'auth/weak-password': 'Mật khẩu phải có ít nhất 6 ký tự.',
    'auth/invalid-email': 'Địa chỉ email không hợp lệ.',
    'auth/too-many-requests': 'Bạn thao tác quá nhiều lần. Hãy đợi một lúc rồi thử lại.',
    'auth/network-request-failed': 'Không kết nối được dịch vụ. Hãy kiểm tra mạng và thử lại.'
  }
  return new Error(messages[code] || (error instanceof Error ? error.message : 'Không thể xác thực tài khoản.'))
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  configured: boolean
  signInWithGoogle: () => Promise<User>
  signInWithEmail: (email: string, password: string) => Promise<User>
  /** Danh tính tạm cho khách vào phòng xem chung bằng link, không cần tài khoản. */
  signInAsGuest: () => Promise<User>
  registerWithEmail: (name: string, email: string, password: string) => Promise<{ user: User; verificationEmailSent: boolean }>
  resetPassword: (email: string) => Promise<void>
  sendVerification: () => Promise<void>
  updateIdentity: (displayName: string, photoURL?: string | null) => Promise<void>
  refreshUser: () => Promise<void>
  deleteCurrentAccount: (password?: string, beforeDelete?: () => Promise<void>) => Promise<void>
  logout: () => Promise<void>
  getIdToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function requireRuntime() {
  const runtime = await loadFirebaseRuntime()
  if (!runtime.auth) throw new Error('Thiếu cấu hình NEXT_PUBLIC_FIREBASE_* trong file .env.')
  return { ...runtime, auth: runtime.auth }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authVersion, setAuthVersion] = useState(0)
  const [configured, setConfigured] = useState(false)

  useEffect(() => {
    let active = true
    let unsubscribe: (() => void) | undefined
    const timeout = window.setTimeout(() => { if (active) setLoading(false) }, 4000)

    void loadFirebaseRuntime().then(({ auth, authApi, configured: runtimeConfigured }) => {
      if (!active) return
      setConfigured(runtimeConfigured)
      if (!auth) {
        window.clearTimeout(timeout)
        setLoading(false)
        return
      }
      unsubscribe = authApi.onAuthStateChanged(auth, (nextUser) => {
        window.clearTimeout(timeout)
        setUser(nextUser)
        setLoading(false)
      }, () => {
        window.clearTimeout(timeout)
        setUser(null)
        setLoading(false)
      })
    }).catch(() => {
      if (active) {
        window.clearTimeout(timeout)
        setConfigured(false)
        setLoading(false)
      }
    })

    return () => {
      active = false
      window.clearTimeout(timeout)
      unsubscribe?.()
    }
  }, [])

  const provisionProfile = useCallback((accountApi: AccountApi, signedInUser: User, displayName?: string) => {
    void accountApi.ensureAccountProfile(signedInUser, displayName).catch((error) => {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : undefined
      console.warn('account_profile_provision_failed', { code })
    })
  }, [])

  /**
   * Đăng nhập ẩn danh của Firebase. Dùng cho khách mở link phòng xem chung:
   * socket-server vẫn yêu cầu một idToken hợp lệ (server.js:91), nên thay vì nới
   * lỏng backend thì cấp cho khách một danh tính tạm — mọi ràng buộc uid,
   * rate-limit và phân quyền host ở server giữ nguyên.
   *
   * Cần bật provider Anonymous trong Firebase Console → Authentication.
   */
  const signInAsGuest = useCallback(async () => {
    try {
      const { auth, authApi } = await requireRuntime()
      const signedInUser = (await authApi.signInAnonymously(auth)).user
      setUser(signedInUser)
      return signedInUser
    } catch (error) {
      throw firebaseAuthError(error)
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    try {
      const { auth, authApi, accountApi } = await requireRuntime()
      const provider = new authApi.GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const signedInUser = (await authApi.signInWithPopup(auth, provider)).user
      provisionProfile(accountApi, signedInUser)
      return signedInUser
    } catch (error) { throw firebaseAuthError(error) }
  }, [provisionProfile])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const { auth, authApi, accountApi } = await requireRuntime()
      const signedInUser = (await authApi.signInWithEmailAndPassword(auth, email.trim(), password)).user
      provisionProfile(accountApi, signedInUser)
      return signedInUser
    } catch (error) { throw firebaseAuthError(error) }
  }, [provisionProfile])

  const registerWithEmail = useCallback(async (name: string, email: string, password: string) => {
    try {
      const { auth, authApi, accountApi } = await requireRuntime()
      const result = await authApi.createUserWithEmailAndPassword(auth, email.trim(), password)
      const displayName = name.trim().slice(0, 40)
      if (displayName) {
        try { await authApi.updateProfile(result.user, { displayName }) }
        catch (error) {
          const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : undefined
          console.warn('auth_registration_identity_update_failed', { code })
        }
      }
      provisionProfile(accountApi, result.user, displayName)
      let verificationEmailSent = true
      try { await authApi.sendEmailVerification(result.user) }
      catch (error) {
        verificationEmailSent = false
        const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : undefined
        console.warn('auth_verification_email_failed', { code })
      }
      return { user: result.user, verificationEmailSent }
    } catch (error) { throw firebaseAuthError(error) }
  }, [provisionProfile])

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { auth, authApi } = await requireRuntime()
      await authApi.sendPasswordResetEmail(auth, email.trim())
    } catch (error) { throw firebaseAuthError(error) }
  }, [])

  const sendVerification = useCallback(async () => {
    if (!user) throw new Error('Bạn chưa đăng nhập.')
    try {
      const { authApi } = await requireRuntime()
      await authApi.sendEmailVerification(user)
    } catch (error) { throw firebaseAuthError(error) }
  }, [user])

  const updateIdentity = useCallback(async (displayName: string, photoURL?: string | null) => {
    if (!user) throw new Error('Bạn chưa đăng nhập.')
    try {
      const { authApi } = await requireRuntime()
      await authApi.updateProfile(user, { displayName: displayName.trim().slice(0, 40), ...(photoURL !== undefined ? { photoURL: photoURL || null } : {}) })
      await authApi.reload(user)
      setAuthVersion((value) => value + 1)
    } catch (error) { throw firebaseAuthError(error) }
  }, [user])

  const refreshUser = useCallback(async () => {
    if (!user) return
    const { authApi } = await requireRuntime()
    await authApi.reload(user)
    setAuthVersion((value) => value + 1)
  }, [user])

  const deleteCurrentAccount = useCallback(async (password?: string, beforeDelete?: () => Promise<void>) => {
    if (!user) return
    try {
      const { authApi, accountApi } = await requireRuntime()
      if (user.providerData.some((provider) => provider.providerId === 'password')) {
        if (!password || !user.email) throw new Error('Hãy nhập mật khẩu để xác nhận.')
        await authApi.reauthenticateWithCredential(user, authApi.EmailAuthProvider.credential(user.email, password))
      } else {
        await authApi.reauthenticateWithPopup(user, new authApi.GoogleAuthProvider())
      }
      if (beforeDelete) await beforeDelete()
      else await accountApi.deleteAccountData(await accountApi.ensureAccountProfile(user))
      await authApi.deleteUser(user)
      setUser(null)
    } catch (error) { throw firebaseAuthError(error) }
  }, [user])

  const logout = useCallback(async () => {
    const { auth, authApi } = await requireRuntime()
    await authApi.signOut(auth)
  }, [])
  const getIdToken = useCallback(async () => user ? user.getIdToken() : null, [user])
  const value = useMemo(() => ({ user, loading, configured, signInAsGuest, signInWithGoogle, signInWithEmail, registerWithEmail, resetPassword, sendVerification, updateIdentity, refreshUser, deleteCurrentAccount, logout, getIdToken }), [user, loading, configured, authVersion, signInAsGuest, signInWithGoogle, signInWithEmail, registerWithEmail, resetPassword, sendVerification, updateIdentity, refreshUser, deleteCurrentAccount, logout, getIdToken])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
