import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/LogSeed/', // 仓库名，注意前后斜杠
  plugins: [react()],
});
