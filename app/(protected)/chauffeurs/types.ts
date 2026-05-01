import type { TChauffeurFormValues } from './schema'

export type TChauffeurPayload = TChauffeurFormValues

export type TChauffeur = TChauffeurPayload & {
  id: number
  blocked: boolean
  rating?: number
}

export type TChauffeurListResponse = {
  data: TChauffeur[]
  pageNo: number
  pageSize: number
  pages: number
  total: number
}
