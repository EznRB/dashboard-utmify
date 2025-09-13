import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-primary">
          Bem-vindo ao Utmify
        </h1>
        <p className="text-muted-foreground text-lg">
          Sua plataforma de análise de marketing digital
        </p>
        <Link 
          href="/dashboard" 
          className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          Acessar Dashboard
        </Link>
      </div>
    </div>
  )
}