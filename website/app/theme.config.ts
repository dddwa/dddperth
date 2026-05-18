/**
 * Active Theme Configuration
 *
 * DOWNSTREAM CUSTOMIZATION POINT:
 * This file selects the conference's dark + light theme pair.
 * Both themes ship in the CSS bundle; the active one is chosen at runtime
 * via the `data-theme` attribute on the <html> element (see useTheme).
 *
 * Example for a fork:
 *   export { myConfDarkTheme as currentTheme } from '../themes/my-conf.theme'
 *   export { myConfLightTheme as currentLightTheme } from '../themes/my-conf-light.theme'
 */

export { dddPerthTheme as currentTheme } from '../themes/ddd-perth.theme'
export { dddPerthLightTheme as currentLightTheme } from '../themes/ddd-perth-light.theme'

/**
 * Optional: Theme overrides
 * Use this to make small tweaks without creating a full theme file
 * Leave empty if you're using a complete theme definition
 */
export const themeOverrides = {
  // Example:
  // colors: {
  //   brand: {
  //     primary: { value: '#CUSTOM_COLOR' }
  //   }
  // }
}
