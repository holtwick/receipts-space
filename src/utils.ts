import type { ManagedObject } from './_types'
import { digest, distributedFilePath, isNumber, isRecord, toBase64Url, toHumanReadableFilePath } from 'zeed'

// See https://receipts.viidoo.space/docs#transactions
export async function transactionJsonlDecode(data: Uint8Array): Promise<{ changes: any[], ts: number }> {
  const headerEnd = data.indexOf(10)
  const header = JSON.parse(new TextDecoder().decode(data.slice(0, headerEnd)))
  const contentBytes = data.slice(headerEnd + 1)
  if (contentBytes.length !== header.s) {
    throw new Error('Size mismatch')
  }
  const checksum = toBase64Url(await digest(contentBytes))
  if (checksum !== header.c) {
    throw new Error('Checksum mismatch')
  }
  if (header.s > 0) {
    const content = new TextDecoder().decode(contentBytes)
    const changes = content.split('\n').map(line => JSON.parse(line))
    return { changes, ts: header.t }
  }
  return { changes: [], ts: header.t }
}

export function applyChange(
  managedObject: ManagedObject | undefined,
  change: any,
): ManagedObject {
  const { _v: time, _type, _id, ...changedProperties } = change

  // Create managed object if not present
  if (managedObject == null) {
    managedObject = {
      obj: { _id, _type },
      history: {},
    } as ManagedObject
  }

  // Iterate over all changed objects and properties
  const { obj, history } = managedObject
  for (const [key, value] of Object.entries(changedProperties)) {
    if (key.endsWith('$'))
      throw new Error('Attribute name is not compliant.')

    // Compare the reference time with the one of the change
    const currentTime = history[key]

    // Record -> recursion
    if (isRecord(value)) {
      const keyHistory = `${key}$`

      if (!isRecord(obj[key])) {
        history[key] = time
        obj[key] = {}
      }

      if (history[keyHistory] == null)
        history[keyHistory] = {}

      applyChange({
        obj: obj[key],
        history: history[keyHistory],
      }, {
        _v: time,
        ...value,
      })
    }

    // If change is newer, set its value
    else if (currentTime == null || (isNumber(currentTime) && currentTime <= time)) {
      // Conflict resolution on equal time
      if (currentTime === time) {
        // Skip if bigger
        if (changedProperties[key] > (value as any))
          continue
      }

      // Write down in history
      history[key] = time

      // null -> delete
      if (value == null)
        delete obj[key]

      // Primitive -> set
      else
        obj[key] = value
    }
  }

  return managedObject
}

// See https://receipts.viidoo.space/docs#assets
export function parseAssetUrl(url: string) {
  if (url) {
    const parts = url.split(/[?/]/g)
    const cid = parts[3]
    const idx = parts[4]
    const name = parts[5]
    return {
      cid,
      idx,
      name: toHumanReadableFilePath(name),
      pathList: distributedFilePath(+idx, 1000),
    }
  }
}
