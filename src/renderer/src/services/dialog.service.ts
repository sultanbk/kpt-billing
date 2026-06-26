export interface DialogService {
  openFile: (options: { filters?: { name: string; extensions: string[] }[] }) => Promise<unknown>
  openFolder: (path: string) => Promise<boolean>
}

export const dialogService: DialogService = {
  openFile: (options) => window.api.dialog.openFile(options),
  openFolder: (path) => window.api.dialog.openFolder(path)
}
