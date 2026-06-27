import { IndianRupee } from 'lucide-react'

export function SplashScreen({ exiting = false }: { exiting?: boolean }): React.JSX.Element {
  return (
    <div
      className={`flex min-h-screen items-center justify-center bg-[#111315] text-white transition-opacity duration-300 ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-[var(--kpt-gold)]/25 blur-xl animate-subtle-pulse" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--kpt-maroon)] to-[var(--kpt-maroon-light)] shadow-2xl">
            <IndianRupee className="h-10 w-10 text-white" />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight">Sarva One</h1>
          <p className="mt-1 text-sm font-medium uppercase tracking-[0.3em] text-white/45">
            Billing
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-white/65">
          <span className="h-2 w-2 rounded-full bg-[var(--kpt-gold)] animate-subtle-pulse" />
          Initializing...
        </div>
      </div>
    </div>
  )
}
