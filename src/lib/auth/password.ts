/** Password hashing. The only module that knows which algorithm is in use. */

import { compare, hash } from 'bcryptjs'

const BCRYPT_ROUNDS = 10

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, BCRYPT_ROUNDS)
}

export function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return compare(plain, passwordHash)
}
