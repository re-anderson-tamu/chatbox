import { autoUpdater } from 'electron-updater'
import { getSettings } from './store-node'
import { getLogger } from './util'

const log = getLogger('app-updater')

export class AppUpdater {
  constructor(onUpdateDownloaded: () => void) {
    log.transports.file.level = 'info'
    autoUpdater.logger = log

    autoUpdater.once('update-downloaded', (event) => {
      // Notify renderer process about the update
      onUpdateDownloaded()
    })
    const settings = getSettings()
    if (settings.autoUpdate) {
      // 立即检查一次更新
      this.tryUpdate()

      // 设置定时器，每小时检查一次更新
      setInterval(
        () => {
          this.tryUpdate()
        },
        1000 * 60 * 60
      ) // 每小时检查一次

      log.info('Update timer started, checking every hour')
    }
  }

  async tryUpdate() {
    try {
      const settings = getSettings()
      if (settings.betaUpdate) {
        autoUpdater.channel = 'beta'
        autoUpdater.allowDowngrade = false
      }
      // Feed URL is embedded in app-update.yml by electron-builder at build time
      // (from the publish.url in electron-builder.yml). No setFeedURL needed.
      return await autoUpdater.checkForUpdatesAndNotify()
    } catch (e) {
      log.error('auto_updater: check failed. ', e)
    }
    return null
  }
}
