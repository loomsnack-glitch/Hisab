/** @type {import('tailwindcss').Config} */
module.exports = {
  // REQUIRED for the manual Light/Dark/System toggle: NativeWind's `setColorScheme`
  // throws under the default `darkMode: 'media'`. `class` lets the toggle drive the
  // `dark:` variant (it still defaults to the OS scheme until the user overrides).
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand primary — keep in sync with `Colors.*.primary` in
        // src/constants/theme.ts (used for non-className props like tint colors).
        brand: {
          DEFAULT: '#da6243',
          foreground: '#ffffff',
        },
      },
    },
  },
  plugins: [],
};
