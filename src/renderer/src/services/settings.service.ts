export interface SettingsService {
  get: (key: string) => Promise<string | null>
  getAll: () => Promise<Record<string, string>>
  setMany: (settings: Record<string, string>) => Promise<boolean>
}

export const settingsService: SettingsService = {
  get: (key) => window.api.settings.get(key),
  getAll: () => window.api.settings.getAll(),
  setMany: (settings) => window.api.settings.setMany(settings)
}
