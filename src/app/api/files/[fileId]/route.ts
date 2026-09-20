/**
 * File download.
 *
 * The proxy does not run on /api, so this handler authenticates for itself and
 * checks that the viewer has a part in the workflow the file belongs to - a
 * file id alone is never enough to read someone else's document.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth/dal'
import { findFileById } from '@/lib/db/repositories/files'
import { listTasksForInstance } from '@/lib/db/repositories/tasks'
import { findInstanceById } from '@/lib/db/repositories/workflow-instances'
import { can } from '@/lib/auth/permissions'
import { FileRejected, readStoredFile } from '@/lib/files/storage'
import { isEntityId } from '@/lib/ids/format'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return new NextResponse('Not authorised', { status: 401 })

  const { fileId } = await params
  if (!isEntityId(fileId, 'file')) return new NextResponse('Not found', { status: 404 })

  const file = await findFileById(fileId)
  if (!file) return new NextResponse('Not found', { status: 404 })

  const instance = await findInstanceById(file.instanceId)
  if (!instance) return new NextResponse('Not found', { status: 404 })

  const tasks = await listTasksForInstance(instance.instanceId)
  const involved =
    instance.initiatedBy === user.userId ||
    tasks.some((task) => task.assignees.includes(user.userId))

  if (!involved && !can(user.accessLevel, 'instance.view_all')) {
    // Same answer as a missing file: whether it exists is not theirs to learn.
    return new NextResponse('Not found', { status: 404 })
  }

  try {
    const bytes = await readStoredFile(file.storageKey)
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': file.mimeType,
        'Content-Length': String(bytes.byteLength),
        // `inline` lets a PDF preview in the browser; the quoted filename
        // keeps a comma or quote in the name from breaking the header.
        'Content-Disposition': `inline; filename="${file.name.replace(/["\\]/g, '')}"`,
      },
    })
  } catch (error) {
    if (error instanceof FileRejected) {
      return new NextResponse('Not found', { status: 404 })
    }
    return new NextResponse('File unavailable', { status: 500 })
  }
}
