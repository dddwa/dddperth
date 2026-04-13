/**
 * Active Theme Configuration
 *
 * DOWNSTREAM CUSTOMIZATION POINT:
 * This file selects which theme is currently active.
 * Change the import to use your conference's theme.
 *
 * Example for a fork:
 * export { myConferenceTheme as currentTheme } from '../themes/my-conference.theme'
 */

export { dddPerthTheme as currentTheme } from '../themes/ddd-perth.theme'

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
