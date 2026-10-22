import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'crc5fllu',
    dataset: 'production'
  },
  studioHost: 'rn-roam',
  deployment: {
    appId: 'ine52svrzlbrdhe3xu4jckk3',
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
})
