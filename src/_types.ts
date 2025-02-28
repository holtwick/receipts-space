// See https://receipts.viidoo.space/docs#crdt
export interface ManagedObject {
  obj: Record<string, any>
  history: Record<string, any>
}

export interface Info {
  apiVersion: number
}

export const FILE_NAME_INFO = 'info.json'

export const FOLDER_NAME_ASSETS = 'assets'
export const FOLDER_NAME_TRANSACTIONS = 'transactions'

export const FILE_NAME_EXTENSION = '.dat'
