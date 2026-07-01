import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
  Rocket,
  AlertTriangle,
  Monitor
} from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { updaterService } from '../../../services/updater.service'
import { SettingsSection } from './SettingsFields'
import type { UpdateStatus } from '@shared/types'

const DEFAULT_STATUS: UpdateStatus = {
  state: 'idle',
  currentVersion: '—'
}

export function UpdatesTab(): React.JSX.Element {
  const [status, setStatus] = useState<UpdateStatus>(DEFAULT_STATUS)
  const [checking, setChecking] = useState(false)

  // Fetch initial status + subscribe to live changes
  useEffect(() => {
    updaterService.getStatus().then(setStatus).catch(console.error)
    const unsub = updaterService.onStatusChanged(setStatus)
    return unsub
  }, [])

  const handleCheck = useCallback(async () => {
    setChecking(true)
    try {
      const result = await updaterService.check()
      setStatus(result)
    } catch (err) {
      console.error('Update check failed:', err)
    } finally {
      setChecking(false)
    }
  }, [])

  const handleInstall = useCallback(() => {
    updaterService.install()
  }, [])

  const isChecking = checking || status.state === 'checking'
  const progressPercent = status.downloadProgress?.percent ?? 0
  const transferredMB = ((status.downloadProgress?.transferred ?? 0) / 1024 / 1024).toFixed(1)
  const totalMB = ((status.downloadProgress?.total ?? 0) / 1024 / 1024).toFixed(1)

  return (
    <SettingsSection
      title="Application Updates"
      description="Check for and install the latest version of KPT Billing."
      icon={<Download className="h-4 w-4" />}
    >
      {/* Hero — Version Badge */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/8 scale-150" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-inner">
            <Monitor className="h-8 w-8 text-primary" />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto space-y-6">
        {/* Current version card */}
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/80 p-4">
          <div>
            <p className="text-sm font-medium text-foreground/80">Current Version</p>
            <p className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
              v{status.currentVersion}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8">
            <Rocket className="h-5 w-5 text-primary" />
          </div>
        </div>

        {/* Status display */}
        <div className="rounded-xl border border-border/60 bg-background/80 p-5 space-y-4">
          {/* Idle / Not available */}
          {(status.state === 'idle' || status.state === 'not-available') && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">You&apos;re up to date</p>
                <p className="text-xs text-muted-foreground">
                  KPT Billing v{status.currentVersion} is the latest version.
                </p>
              </div>
            </div>
          )}

          {/* Checking */}
          {status.state === 'checking' && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Checking for updates…</p>
                <p className="text-xs text-muted-foreground">Connecting to the update server.</p>
              </div>
            </div>
          )}

          {/* Available (brief — autoDownload kicks in immediately) */}
          {status.state === 'available' && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <Download className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Update v{status.availableVersion} available
                </p>
                <p className="text-xs text-muted-foreground">Download will start automatically.</p>
              </div>
            </div>
          )}

          {/* Downloading — progress bar */}
          {status.state === 'downloading' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <Download className="h-5 w-5 text-blue-500 animate-bounce" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Downloading v{status.availableVersion}…
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {transferredMB} / {totalMB} MB
                  </p>
                </div>
                <span className="text-sm font-bold text-primary tabular-nums">
                  {progressPercent.toFixed(0)}%
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Downloaded — ready to install */}
          {status.state === 'downloaded' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Update v{status.availableVersion} ready!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    The update will install automatically when you close the app, or restart now.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleInstall}
                className="w-full rounded-xl h-10 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Rocket className="h-4 w-4" />
                Restart & Install Update
              </Button>
            </div>
          )}

          {/* Error */}
          {status.state === 'error' && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Update check failed</p>
                <p className="text-xs text-muted-foreground truncate">
                  {status.error || 'An unknown error occurred.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Check for Updates button */}
        {status.state !== 'downloading' && status.state !== 'downloaded' && (
          <Button
            onClick={handleCheck}
            disabled={isChecking}
            variant="outline"
            className="w-full rounded-xl h-10 gap-2"
          >
            {isChecking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isChecking ? 'Checking…' : 'Check for Updates'}
          </Button>
        )}

        {/* Last checked timestamp */}
        {status.lastChecked && (
          <p className="text-center text-[11px] text-muted-foreground/60">
            Last checked: {new Date(status.lastChecked).toLocaleString()}
          </p>
        )}

        {/* Info note */}
        {/* <div className="rounded-lg bg-muted/30 border border-border/40 p-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Updates are checked automatically every 4 hours and downloaded in the background. They
            install silently when you close the app — no disruption to billing.
          </p>
        </div> */}
      </div>
    </SettingsSection>
  )
}
