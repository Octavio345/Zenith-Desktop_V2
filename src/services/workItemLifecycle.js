export const CONFIRMED_WORK_ITEM_RETENTION_MS = 2 * 60 * 60 * 1000

const toMillis = (value) => {
  if (!value) return null
  if (typeof value?.toDate === "function") return value.toDate().getTime()
  if (typeof value?.seconds === "number") return value.seconds * 1000
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : null
}

export const isConfirmedWorkItemExpired = (item, now = Date.now()) => {
  const confirmedAt = toMillis(item?.ownerConfirmedAt)
  return confirmedAt !== null && now - confirmedAt >= CONFIRMED_WORK_ITEM_RETENTION_MS
}

export const isAwaitingOwnerConfirmation = (item) => (
  item?.status === "concluida" && !item?.ownerConfirmedAt
)

