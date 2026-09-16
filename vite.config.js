import { defineConfig } from 'vite';

// Relative base so the build works both at a domain root (Netlify, Vercel)
// and under a subpath (GitHub Pages project sites).
export default defineConfig({
  base: './',
});
