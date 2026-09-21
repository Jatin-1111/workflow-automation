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
