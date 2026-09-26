/** Data access for departments. */

import { getCollection, WITHOUT_ID } from '../collection'
import { COLLECTIONS } from '../collections'
import type { DepartmentId } from '@/lib/types/ids'
import type { Department } from '@/lib/types/organization'

async function departments() {
  return getCollection<Department>(COLLECTIONS.departments)
}

export async function insertDepartments(docs: Department[]): Promise<void> {
  if (docs.length === 0) return
  await (await departments()).insertMany(docs)
}

export async function findDepartmentById(
  departmentId: DepartmentId,
): Promise<Department | null> {
  return (await departments()).findOne({ departmentId }, WITHOUT_ID)
}

export async function listDepartments(): Promise<Department[]> {
  return (await departments()).find({}, WITHOUT_ID).sort({ name: 1 }).toArray()
}

export async function insertDepartment(doc: Department): Promise<void> {
  await (await departments()).insertOne(doc)
}

/** Field-level edit. Deactivating is a status change, never a delete: people
 * and history still point at the department. */
export async function updateDepartment(
  departmentId: DepartmentId,
  changes: Partial<Department>,
): Promise<void> {
  await (await departments()).updateOne(
    { departmentId },
    { $set: { ...changes, updatedAt: new Date() } },
  )
}

/** Remove a department outright. Callers check for references first. */
export async function deleteDepartment(departmentId: DepartmentId): Promise<void> {
  await (await departments()).deleteOne({ departmentId })
}
