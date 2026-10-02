import { PageSkeleton } from '@/features/ui/page-skeleton'

export default function Loading() {
  return <PageSkeleton rows={5} tiles={4} width="framed" />
}
