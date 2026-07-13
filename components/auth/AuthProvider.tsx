'use client'

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createUserWithEmailAndPassword, deleteUser, EmailAuthProvider, GoogleAuthProvider, onAuthStateChanged, reauthenticateWithCredential, reauthenticateWithPopup, reload, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile, User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { deleteAccountData, ensureAccountProfile } from '@/lib/account-service'

export function firebaseAuthError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  const messages: Record<string, string> = {
    'auth/configuration-not-found': 'Dịch vụ đăng nhập tạm thời không khả dụng. Vui lòng quay lại sau.',
    'auth/operation-not-allowed': 'Phương thức đăng nhập này chưa được kích hoạt. Vui lòng quay lại sau.',
    'auth/unauthorized-domain': 'Ứng dụng không được cấp quyền đăng nhập từ địa chỉ này.',
    'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập Google.',
    'auth/popup-blocked': 'Trình duyệt đang chặn cửa sổ đăng nhập. Hãy cho phép popup và thử lại.',
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
  registerWithEmail: (name: string, email: string, password: string) => Promise<User>
  resetPassword: (email: string) => Promise<void>
  sendVerification: () => Promise<void>
  updateIdentity: (displayName: string, photoURL?: string | null) => Promise<void>
  refreshUser: () => Promise<void>
  deleteCurrentAccount: (password?: string, beforeDelete?: () => Promise<void>) => Promise<void>
  logout: () => Promise<void>
  getIdToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authVersion, setAuthVersion] = useState(0)
  useEffect(() => {
    if (!auth) { setLoading(false); return undefined }
    // Do not leave protected routes on an infinite spinner if Firebase auth
    // initialization is delayed or blocked by the browser/network.
    const timeout = window.setTimeout(() => setLoading(false), 4000)
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => { window.clearTimeout(timeout); setUser(nextUser); setLoading(false) }, () => { window.clearTimeout(timeout); setUser(null); setLoading(false) })
    return () => { window.clearTimeout(timeout); unsubscribe() }
  }, [])

  const requireAuth = useCallback(() => { if (!auth) throw new Error('Thiếu cấu hình NEXT_PUBLIC_FIREBASE_* trong file .env.'); return auth }, [])
  const signInWithGoogle = useCallback(async () => { try { return (await signInWithPopup(requireAuth(), new GoogleAuthProvider())).user } catch (error) { throw firebaseAuthError(error) } }, [requireAuth])
  const signInWithEmail = useCallback(async (email: string, password: string) => { try { return (await signInWithEmailAndPassword(requireAuth(), email.trim(), password)).user } catch (error) { throw firebaseAuthError(error) } }, [requireAuth])
  const registerWithEmail = useCallback(async (name: string, email: string, password: string) => { try { const result = await createUserWithEmailAndPassword(requireAuth(), email.trim(), password); if (name.trim()) await updateProfile(result.user, { displayName: name.trim().slice(0, 40) }); await sendEmailVerification(result.user).catch(() => undefined); return result.user } catch (error) { throw firebaseAuthError(error) } }, [requireAuth])
  const resetPassword = useCallback(async (email: string) => { try { await sendPasswordResetEmail(requireAuth(), email.trim()) } catch (error) { throw firebaseAuthError(error) } }, [requireAuth])
  const sendVerification = useCallback(async () => { if (!user) throw new Error('Bạn chưa đăng nhập.'); try { await sendEmailVerification(user) } catch (error) { throw firebaseAuthError(error) } }, [user])
  const updateIdentity = useCallback(async (displayName: string, photoURL?: string | null) => { if (!user) throw new Error('Bạn chưa đăng nhập.'); try { await updateProfile(user, { displayName: displayName.trim().slice(0, 40), ...(photoURL !== undefined ? { photoURL: photoURL || null } : {}) }); await reload(user); setAuthVersion((value) => value + 1) } catch (error) { throw firebaseAuthError(error) } }, [user])
  const refreshUser = useCallback(async () => { if (!user) return; await reload(user); setAuthVersion((value) => value + 1) }, [user])
  const deleteCurrentAccount = useCallback(async (password?: string, beforeDelete?: () => Promise<void>) => { if (!user) return; try { if (user.providerData.some((provider) => provider.providerId === 'password')) { if (!password || !user.email) throw new Error('Hãy nhập mật khẩu để xác nhận.'); await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password)) } else await reauthenticateWithPopup(user, new GoogleAuthProvider()); if (beforeDelete) await beforeDelete(); else await deleteAccountData(await ensureAccountProfile(user)); await deleteUser(user); setUser(null) } catch (error) { throw firebaseAuthError(error) } }, [user])
  const logout = useCallback(async () => { if (auth) await signOut(auth) }, [])
  const getIdToken = useCallback(async () => user ? user.getIdToken() : null, [user])
  const value = useMemo(() => ({ user, loading, configured: Boolean(auth), signInWithGoogle, signInWithEmail, registerWithEmail, resetPassword, sendVerification, updateIdentity, refreshUser, deleteCurrentAccount, logout, getIdToken }), [user, loading, authVersion, signInWithGoogle, signInWithEmail, registerWithEmail, resetPassword, sendVerification, updateIdentity, refreshUser, deleteCurrentAccount, logout, getIdToken])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
