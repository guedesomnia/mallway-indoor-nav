import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0', // Permite conexões de iPhone e Android na rede local Wi-Fi
    port: 5174,
    // Em desenvolvimento a API (FastAPI, porta 8000) e os arquivos publicados respondem no mesmo endereço do app.
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/auth': 'http://127.0.0.1:8000',
      '/p': 'http://127.0.0.1:8000'
    }
  }
});
