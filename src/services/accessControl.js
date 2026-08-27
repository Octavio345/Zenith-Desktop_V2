import { doc, getDoc } from "firebase/firestore"
import { db } from "./firebase"

export const ACCOUNT_ROLES = {
  ADMIN: "admin",
  EMPLOYEE: "employee",
  COLLABORATOR: "collaborator",
}

export function normalizeRole(role) {
  if (role === ACCOUNT_ROLES.EMPLOYEE) return ACCOUNT_ROLES.EMPLOYEE
  if (role === ACCOUNT_ROLES.COLLABORATOR) return ACCOUNT_ROLES.COLLABORATOR
  return ACCOUNT_ROLES.ADMIN
}

export function isOperationalRole(role) {
  const normalizedRole = normalizeRole(role)
  return normalizedRole === ACCOUNT_ROLES.EMPLOYEE || normalizedRole === ACCOUNT_ROLES.COLLABORATOR
}

export function isAccountBlocked(profile) {
  return profile?.archived === true || profile?.accessStatus === "blocked"
}

export function getRoleHomePath() {
  return "/home"
}

export async function getUserAccessProfile(uid) {
  if (!uid) return null

  const userSnap = await getDoc(doc(db, "users", uid))
  if (!userSnap.exists()) return null

  const data = userSnap.data()
  return {
    id: userSnap.id,
    ...data,
    role: normalizeRole(data.role),
  }
}
