import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // host: true deixa abrir o site pelo celular na mesma rede (http://IP-DO-PC:5173)
  server: { host: true },
});
