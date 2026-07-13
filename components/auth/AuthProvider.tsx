'use client'

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createUserWithEmailAndPassword, GoogleAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile, User, onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export function firebaseAuthError(error: unknown) {
  console.error('Firebase Auth Error Details:', error)
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
  logout: () => Promise<void>
  getIdToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!auth) { setLoading(false); return undefined }
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => { setUser(nextUser); setLoading(false) })
    return () => unsubscribe()
  }, [])

  const requireAuth = useCallback(() => { if (!auth) throw new Error('Thiếu cấu hình NEXT_PUBLIC_FIREBASE_* trong file .env.'); return auth }, [])
  const signInWithGoogle = useCallback(async () => { try { return (await signInWithPopup(requireAuth(), new GoogleAuthProvider())).user } catch (error) { throw firebaseAuthError(error) } }, [requireAuth])
  const signInWithEmail = useCallback(async (email: string, password: string) => { try { return (await signInWithEmailAndPassword(requireAuth(), email.trim(), password)).user } catch (error) { throw firebaseAuthError(error) } }, [requireAuth])
  const registerWithEmail = useCallback(async (name: string, email: string, password: string) => { try { const result = await createUserWithEmailAndPassword(requireAuth(), email.trim(), password); if (name.trim()) await updateProfile(result.user, { displayName: name.trim().slice(0, 30) }); return result.user } catch (error) { throw firebaseAuthError(error) } }, [requireAuth])
  const resetPassword = useCallback(async (email: string) => { try { await sendPasswordResetEmail(requireAuth(), email.trim()) } catch (error) { throw firebaseAuthError(error) } }, [requireAuth])
  const logout = useCallback(async () => { if (auth) await signOut(auth) }, [])
  const getIdToken = useCallback(async () => user ? user.getIdToken() : null, [user])
  const value = useMemo(() => ({ user, loading, configured: Boolean(auth), signInWithGoogle, signInWithEmail, registerWithEmail, resetPassword, logout, getIdToken }), [user, loading, signInWithGoogle, signInWithEmail, registerWithEmail, resetPassword, logout, getIdToken])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
