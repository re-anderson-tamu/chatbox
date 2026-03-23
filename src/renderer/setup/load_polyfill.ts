import { CHATBOX_BUILD_TARGET } from '../variables'

if (CHATBOX_BUILD_TARGET === 'mobile_app') {
  // @ts-expect-error - core-js lacks type declarations
  import('core-js/actual').catch((error) => {
    // Optionally log or handle the import error
    console.error('Failed to load polyfills:', error)
  })
}
