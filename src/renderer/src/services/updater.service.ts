import type { UpdateStatus } from '@shared/types'

export interface UpdaterService {
  check: () => Promise<UpdateStatus>
  install: () => Promise<void>
  getStatus: () => Promise<UpdateStatus>
  onStatusChanged: (callback: (status: UpdateStatus) => void) => () => void
}

export const updaterService: UpdaterService = {
  check: () => window.api.updater.check(),
  install: () => window.api.updater.install(),
  getStatus: () => window.api.updater.getStatus(),
  onStatusChanged: (cb) => window.api.updater.onStatusChanged(cb)
}
