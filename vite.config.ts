import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// `base` se ajusta en CI según el repositorio de destino: en un sitio de
// organización (auroraworship.github.io) la app cuelga de la raíz, y en un
// repo de proyecto cuelga de /<repo>/.
const base = process.env.AURORA_BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
