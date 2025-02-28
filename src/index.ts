/* eslint-disable no-console */
import type { LoggerInterface } from 'zeed'
import { existsSync } from 'node:fs'
import process from 'node:process'
import { cac } from 'cac'
import { Logger, setupWebCrypto } from 'zeed'
import { version } from '../package.json'
import { commandExport } from './export'

const log: LoggerInterface = Logger('cli')

setupWebCrypto()

async function main() {
  // https://github.com/cacjs/cac#usage
  const cli = cac()

  cli.command('').action(() => cli.outputHelp())

  cli.command('export <file>', 'Export current content to JSON files').action(async (file: string, _options: any) => {
    log.assert(existsSync(file), `File does not exist: ${file}`)
    await commandExport(file)
  })

  cli.help()
  cli.version(version)

  try {
    cli.parse(process.argv, { run: false })
    await cli.runMatchedCommand()
  }
  catch (error: any) {
    console.error(String(error))
    console.info('\n')
    cli.outputHelp()
    process.exit(1)
  }
}

void main()
