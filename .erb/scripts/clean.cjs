const fs = require('fs')
const path = require('path')

const rootPath = path.join(__dirname, '../..')
const dllPath = path.join(__dirname, '../dll')
const releasePath = path.join(rootPath, 'release')
const appPath = path.join(releasePath, 'app')
const appNodeModulesPath = path.join(appPath, 'node_modules')
const distPath = path.join(appPath, 'dist')
const buildPath = path.join(releasePath, 'build')

const foldersToRemove = [distPath, appNodeModulesPath, buildPath, dllPath]

for (const folder of foldersToRemove) {
    if (fs.existsSync(folder)) {
        fs.rmSync(folder, { recursive: true, force: true })
        console.log('Removed:', folder)
    }
}
