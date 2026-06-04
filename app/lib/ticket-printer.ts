
// Sistema de impresión de tickets térmicos via Bluetooth
export interface TicketConfig {
  // Información del negocio
  nombreNegocio: string;
  direccionNegocio: string;
  telefonoNegocio: string;
  emailNegocio?: string;
  logo?: string;

  // Configuración de impresión
  anchoTicket: number; // 58mm o 80mm
  fontsize: 'small' | 'medium' | 'large';
  imprimirLogo: boolean;
  
  // Campos personalizables
  mostrarCodigoCliente: boolean;
  mostrarTelefono: boolean;
  mostrarDireccion: boolean;
  mostrarSaldo: boolean;
  mostrarDiasVencidos: boolean;
  mostrarMora: boolean;
  
  // Texto personalizable
  tituloTicket: string;
  pieTicket: string;
  mensajeAgradecimiento: string;
}

export interface TicketData {
  // Información del cliente
  cod_cliente: string;
  nombre_cliente: string;
  telefono?: string;
  direccion?: string;
  
  // Información del pago
  monto_pago: number;
  monto_mora?: number;
  saldo_anterior: number;
  saldo_actual: number;
  fecha_pago: string;
  fecha_impresion: string;
  
  // Información del gestor
  codigo_gestor: string;
  nombre_gestor?: string;
  
  // Información de vencimiento
  dias_vencidos?: number;
  proximo_pago?: string;
  
  // Geolocalización
  latitud?: string;
  longitud?: string;
}

class TicketPrinter {
  private defaultConfig: TicketConfig = {
    nombreNegocio: 'MI NEGOCIO',
    direccionNegocio: 'Dirección del negocio',
    telefonoNegocio: 'Tel: (000) 000-0000',
    emailNegocio: '',
    logo: '',
    anchoTicket: 58,
    fontsize: 'medium',
    imprimirLogo: false,
    mostrarCodigoCliente: true,
    mostrarTelefono: true,
    mostrarDireccion: false,
    mostrarSaldo: true,
    mostrarDiasVencidos: true,
    mostrarMora: true,
    tituloTicket: 'COMPROBANTE DE PAGO',
    pieTicket: 'Gracias por su pago',
    mensajeAgradecimiento: '¡Gracias por su preferencia!'
  };

  async getTicketConfig(): Promise<TicketConfig> {
    try {
      const config = await offlineStorage.getConfig('ticketConfig');
      return config ? { ...this.defaultConfig, ...config } : this.defaultConfig;
    } catch (error) {
      console.error('Error obteniendo configuración de ticket:', error);
      return this.defaultConfig;
    }
  }

  async saveTicketConfig(config: Partial<TicketConfig>): Promise<void> {
    try {
      const currentConfig = await this.getTicketConfig();
      const newConfig = { ...currentConfig, ...config };
      await offlineStorage.saveConfig('ticketConfig', newConfig);
    } catch (error) {
      console.error('Error guardando configuración de ticket:', error);
      throw error;
    }
  }

  generateTicketContent(data: TicketData, config: TicketConfig): string {
    const lines: string[] = [];
    const width = config.anchoTicket === 58 ? 32 : 48;
    
    // Header del negocio
    lines.push(this.center(config.nombreNegocio, width));
    lines.push(this.center(config.direccionNegocio, width));
    lines.push(this.center(config.telefonoNegocio, width));
    if (config.emailNegocio) {
      lines.push(this.center(config.emailNegocio, width));
    }
    lines.push(this.repeat('-', width));
    
    // Título del ticket
    lines.push(this.center(config.tituloTicket, width));
    lines.push(this.repeat('-', width));
    
    // Información del cliente
    if (config.mostrarCodigoCliente) {
      lines.push(`Cliente: ${data.cod_cliente}`);
    }
    lines.push(`${data.nombre_cliente}`);
    
    if (config.mostrarTelefono && data.telefono) {
      lines.push(`Tel: ${data.telefono}`);
    }
    
    if (config.mostrarDireccion && data.direccion) {
      lines.push(`Dir: ${data.direccion}`);
    }
    
    lines.push(this.repeat('-', width));
    
    // Información del pago
    lines.push(`Fecha: ${data.fecha_pago}`);
    lines.push(`Hora: ${new Date(data.fecha_impresion).toLocaleTimeString()}`);
    lines.push(this.repeat('-', width));
    
    if (config.mostrarSaldo) {
      lines.push(`Saldo Anterior: $${data.saldo_anterior.toFixed(2)}`);
    }
    
    lines.push(`Pago Recibido: $${data.monto_pago.toFixed(2)}`);
    
    if (config.mostrarMora && data.monto_mora && data.monto_mora > 0) {
      lines.push(`Recargo por Mora: $${data.monto_mora.toFixed(2)}`);
    }
    
    if (config.mostrarSaldo) {
      lines.push(`Saldo Actual: $${data.saldo_actual.toFixed(2)}`);
    }
    
    if (config.mostrarDiasVencidos && data.dias_vencidos && data.dias_vencidos > 0) {
      lines.push(`Días Vencidos: ${data.dias_vencidos}`);
    }
    
    lines.push(this.repeat('-', width));
    
    // Información del gestor
    lines.push(`Gestor: ${data.codigo_gestor}`);
    if (data.nombre_gestor) {
      lines.push(`${data.nombre_gestor}`);
    }
    
    // Geolocalización si está disponible
    if (data.latitud && data.longitud) {
      lines.push(`Ubicación: ${data.latitud}, ${data.longitud}`);
    }
    
    lines.push(this.repeat('-', width));
    
    // Pie del ticket
    if (config.pieTicket) {
      lines.push(this.center(config.pieTicket, width));
    }
    
    if (config.mensajeAgradecimiento) {
      lines.push(this.center(config.mensajeAgradecimiento, width));
    }
    
    lines.push(this.center(`Impreso: ${new Date(data.fecha_impresion).toLocaleString()}`, width));
    
    // Espacio final
    lines.push('');
    lines.push('');
    lines.push('');
    
    return lines.join('\n');
  }

  private center(text: string, width: number): string {
    if (text.length >= width) return text;
    const padding = Math.floor((width - text.length) / 2);
    return ' '.repeat(padding) + text;
  }

  private repeat(char: string, count: number): string {
    return char.repeat(count);
  }

  async printTicket(data: TicketData): Promise<void> {
    try {
      const config = await this.getTicketConfig();
      const content = this.generateTicketContent(data, config);
      
      // Guardar ticket en almacenamiento local
      await offlineStorage.saveTicket({
        ...data,
        content,
        config
      });

      // Intentar imprimir via Bluetooth
      await this.printViaBluetooth(content, config);
      
    } catch (error) {
      console.error('Error imprimiendo ticket:', error);
      throw error;
    }
  }

  private async printViaBluetooth(content: string, config: TicketConfig): Promise<void> {
    try {
      // Verificar si el navegador soporta Web Bluetooth
      if (!('bluetooth' in navigator)) {
        throw new Error('Web Bluetooth no está soportado en este navegador');
      }

      // Solicitar dispositivo Bluetooth
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] // UUID para impresoras térmicas
      });

      if (!device) {
        throw new Error('No se seleccionó dispositivo Bluetooth');
      }

      // Conectar al dispositivo
      const server = await device.gatt!.connect();
      
      // Buscar servicio de impresión
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      // Convertir contenido a comandos ESC/POS
      const commands = this.generateESCPOSCommands(content, config);
      
      // Enviar comandos a la impresora
      await characteristic.writeValue(commands);
      
      console.log('Ticket enviado a impresora Bluetooth');
      
    } catch (error) {
      console.error('Error imprimiendo via Bluetooth:', error);
      // Si falla Bluetooth, intentar otras opciones
      this.fallbackPrint(content);
    }
  }

  private generateESCPOSCommands(content: string, config: TicketConfig): Uint8Array {
    const commands: number[] = [];
    
    // Inicializar impresora
    commands.push(0x1B, 0x40); // ESC @
    
    // Configurar tamaño de fuente
    if (config.fontsize === 'small') {
      commands.push(0x1B, 0x21, 0x00); // Fuente normal
    } else if (config.fontsize === 'large') {
      commands.push(0x1B, 0x21, 0x11); // Fuente doble
    }
    
    // Agregar contenido
    const encoder = new TextEncoder();
    const contentBytes = encoder.encode(content);
    commands.push(...Array.from(contentBytes));
    
    // Cortar papel
    commands.push(0x1D, 0x56, 0x41, 0x10); // GS V A
    
    return new Uint8Array(commands);
  }

  private fallbackPrint(content: string): void {
    // Fallback: abrir ventana para imprimir
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Ticket de Pago</title>
            <style>
              body { font-family: monospace; font-size: 12px; margin: 0; padding: 20px; }
              pre { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <pre>${content}</pre>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }

  async getTicketHistory(): Promise<any[]> {
    try {
      return await offlineStorage.getTickets();
    } catch (error) {
      console.error('Error obteniendo historial de tickets:', error);
      return [];
    }
  }
}

export const ticketPrinter = new TicketPrinter();

import { offlineStorage } from './offline-storage';
