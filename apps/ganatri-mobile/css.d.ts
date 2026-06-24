// Type declarations for CSS imports used by the Expo web target
// (e.g. `import '@/global.css'` and `*.module.css` in `.web.tsx` files).
declare module '*.css';

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
