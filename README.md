# Receipts Space

Receipts Space file format reference implementation

See [Receipts Space Specification](https://receipts-app.com/docs)

## Installation and Usage

This demo is realized as a CLI tool that can be used to export `.receipts-space` libraries to a human-readable format.

```sh
npm install 
npm start export <path-to-receipts-space-library-folder>
```

Use `npm start` to see all available commands.

```txt
Usage:
  $ index.ts 

Commands:
                 
  export <file>  Export current content to JSON files

For more info, run any command with the `--help` flag:
  $ index.ts --help
  $ index.ts export --help

Options:
  -h, --help     Display this message 
  -v, --version  Display version number 
```