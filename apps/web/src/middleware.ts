import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Verificar se o usuário tem permissão para acessar rotas admin
    if (req.nextUrl.pathname.startsWith("/admin") && req.nextauth.token?.role !== "admin") {
      return NextResponse.rewrite(new URL("/auth/unauthorized", req.url))
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Permitir acesso às rotas públicas
        if (req.nextUrl.pathname.startsWith("/auth")) {
          return true
        }
        
        // Permitir acesso às rotas da API de autenticação
        if (req.nextUrl.pathname.startsWith("/api/auth")) {
          return true
        }
        
        // Permitir acesso à página inicial
        if (req.nextUrl.pathname === "/") {
          return true
        }
        
        // Exigir autenticação para outras rotas
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}