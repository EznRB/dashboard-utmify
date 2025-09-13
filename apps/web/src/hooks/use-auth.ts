"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const login = async (email: string, password: string) => {
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        throw new Error("Credenciais inválidas")
      }

      router.push("/dashboard")
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Erro ao fazer login" 
      }
    }
  }

  const logout = async () => {
    await signOut({ redirect: false })
    router.push("/auth/signin")
  }

  const loginWithProvider = (provider: "google" | "github") => {
    signIn(provider, { callbackUrl: "/dashboard" })
  }

  return {
    user: session?.user,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    login,
    logout,
    loginWithProvider,
  }
}