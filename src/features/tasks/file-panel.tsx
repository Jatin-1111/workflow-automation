'use client'

/**
 * Files for this workflow (spec §12, §39).
 *
 * Upload happens from inside the task, and every earlier version stays
 * visible - a revision never replaces what it supersedes.
 */

import { useActionState } from 'react'
import { uploadFileAction, type TaskActionState } from './actions'
import type { TaskFileRow } from './queries'
import type { RequiredFileDefinition } from '@/lib/types/workflow'

const IDLE: TaskActionState = { ok: null }

export function FilePanel({
  taskId,
  slots,
  files,
  canUpload,
}: {
  taskId: string
  slots: RequiredFileDefinition[]
  files: TaskFileRow[]
  canUpload: boolean
}) {
  const [state, upload, uploading] = useActionState(uploadFileAction, IDLE)

  return (
    <section className="rounded-lg border border-border bg-surface">
      <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">Files</h2>

      {files.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">
          Nothing has been uploaded to this workflow yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {files.map((file) => (
            <li key={file.fileId} className="flex items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1">
                <a
                  href={`/api/files/${file.fileId}`}
                  className="block truncate text-sm text-accent underline-offset-4 hover:underline"
                >
                  {file.name}
                </a>
                <span className="text-xs text-subtle">
                  v{file.version} · {file.uploadedByName} ·{' '}
                  {file.uploadedAt.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                  {' · '}
                  {Math.max(1, Math.round(file.sizeBytes / 1024))} KB
                </span>
              </span>
              {file.isFinalApproved ? (
                <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[11px] font-medium text-status-complete">
                  Final approved
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canUpload ? (
        <form action={upload} className="space-y-3 border-t border-border px-4 py-3">
          <input type="hidden" name="taskId" value={taskId} />

          {slots.length > 0 ? (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-subtle">
                What is this file
              </span>
              <select
                name="slotKey"
                defaultValue={slots[0]?.key ?? ''}
                className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
              >
                {slots.map((slot) => (
                  <option key={slot.key} value={slot.key}>
                    {slot.label}
                    {slot.required ? ' (required)' : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <input
            type="file"
            name="file"
            required
            className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border file:border-border-strong file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />

          {state.ok === false ? (
            <p role="alert" className="text-sm text-status-overdue">
              {state.errors[0]?.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={uploading}
            className="rounded-md border border-border-strong bg-surface px-3 py-1.5 text-sm font-medium transition hover:bg-accent-soft disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : 'Upload file'}
          </button>
        </form>
      ) : null}
    </section>
  )
}
