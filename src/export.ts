/* eslint-disable no-console */
import type { Info, ManagedObject } from './_types'
import fs, { copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { distributedFilePath, ensureFolder, readBin, readJson, size, writeJson } from 'zeed'
import { FILE_NAME_EXTENSION, FILE_NAME_INFO, FOLDER_NAME_ASSETS, FOLDER_NAME_TRANSACTIONS } from './_types'
import { applyChange, parseAssetUrl, transactionJsonlDecode } from './utils'

export async function commandExport(path: string) {
  // Read info.json
  const info = await readJson(resolve(path, FILE_NAME_INFO)) as Info | undefined
  if (info == null) {
    console.error('info.json not found')
    process.exit(1)
    return // to satisfy TypeScript
  }

  // Since apiVersion 3 the file extension is .dat
  let ext = ''
  if (+info.apiVersion > 2) {
    ext = FILE_NAME_EXTENSION
  }

  // Find all clientIds in 'transactions' folder
  const pathTransactions = resolve(path, FOLDER_NAME_TRANSACTIONS)
  const clientIdList = ((await fs.readdir(pathTransactions, { withFileTypes: true }))
    .filter(e => !e.name.startsWith('.') && e.isDirectory())
    .map(e => e.name)) ?? []
  console.info(`Found ${clientIdList.length} clients`)

  // Read all transactions
  const data: Record<string, ManagedObject> = {}
  for (const clientId of clientIdList) {
    let clientTransactionIndex = 0
    while (true) {
      // See https://receipts.viidoo.space/docs#structure
      // Read transactions starting from 0 until no more valid transactions are found
      const pathTransactionItem = resolve(pathTransactions, clientId, ...distributedFilePath(clientTransactionIndex, 1000)) + ext
      const bin = await readBin(pathTransactionItem)
      if (bin == null) {
        console.info(`  ... ${clientTransactionIndex} transactions from ${clientId}`)
        break
      }
      clientTransactionIndex += 1

      // Map transactions to change objects
      const transaction = await transactionJsonlDecode(bin) ?? []
      for (const change of transaction.changes) {
        data[change._id] = applyChange(data[change._id], change)
      }
    }
  }
  console.info(`Export of ${size(data)} objects`)

  // Write to disk
  let assetCount = 0
  const basePath = resolve(process.cwd(), 'export')
  for (const [id, managedObject] of Object.entries(data)) {
    const obj = managedObject.obj
    const type = obj._type
    if (type && id) {
      await writeJson(resolve(basePath, type, `${id}.json`), {
        ...obj,
        // _v: mo.history,
      }, { pretty: true, createFolders: true })

      // Export assets
      for (const assetUrl of [obj.asset, obj.assetOriginal, obj.assetExtraction]) {
        if (assetUrl) {
          const asset = parseAssetUrl(assetUrl)
          try {
            if (asset) {
              const assetPath = resolve(basePath, type, id)
              await ensureFolder(assetPath)
              // console.log(asset.cid, asset.idx, asset.name, assetPath)
              const assetSrcPath = resolve(path, FOLDER_NAME_ASSETS, asset.cid, ...asset.pathList) + ext
              await copyFile(assetSrcPath, resolve(assetPath, asset.name))
              assetCount += 1
            }
          }
          catch (e) {
            console.error(e)
          }
        }
      }
    }
  }

  console.info(`Export of ${assetCount} assets`)
  console.info('Done')
}
