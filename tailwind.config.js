/** Config para gerar vendor/tailwind.build.css (CSS estático, sem runtime).
 *  Rebuild: npx tailwindcss@3 -c tailwind.config.js -i tailwind-input.css -o vendor/tailwind.build.css --minify
 */
module.exports = {
  content: ['./index.html'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      colors: {
        brand: { light: '#2dd4bf', DEFAULT: '#0d9488', dark: '#0369a1' },
        clin: { ok: '#10b981', alert: '#f59e0b', danger: '#ef4444', future: '#64748b' }
      }
    }
  }
};
