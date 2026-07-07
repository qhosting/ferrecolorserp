module.exports = {
  apps: [
    {
      name: 'vertexerp',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      // Utiliza 'max' para escalar de forma automática al número de vCPUs del VPS
      // Al hacer upgrade de 2 vCPUs (Opción B) a 8 vCPUs (Opción C), PM2 lo detectará al arrancar.
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G', // Evita fugas de memoria reiniciando si excede 1GB por proceso
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
