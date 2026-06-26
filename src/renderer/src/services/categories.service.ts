export interface CategoriesService {
  getAll: () => Promise<{ id: number; name: string }[]>
  create: (name: string, parentId?: number) => Promise<{ id: number; name: string }>
}

export const categoriesService: CategoriesService = {
  getAll: () => window.api.categories.getAll(),
  create: (name, parentId) => window.api.categories.create(name, parentId)
}
