
// Utilidad para impresión vía Bluetooth
// Esta es una implementación básica que puede expandirse según el hardware

import React, { useState } from 'react';

// Declaraciones de tipos para Web Bluetooth API
declare global {
  interface Navigator {
    bluetooth?: Bluetooth;
  }
  
  interface Bluetooth {
    requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
  }
  
  interface BluetoothDevice {
    gatt?: BluetoothRemoteGATT;
    name?: string;
  }
  
  interface BluetoothRemoteGATT {
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
  }
  
  interface BluetoothRemoteGATTServer {
    getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
  }
  
  interface BluetoothRemoteGATTService {
    getCharacteristic(characteristic: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic>;
  }
  
  interface BluetoothRemoteGATTCharacteristic {
    writeValue(value: BufferSource): Promise<void>;
  }
  
  interface RequestDeviceOptions {
    filters?: BluetoothLEScanFilter[];
    acceptAllDevices?: boolean;
    optionalServices?: BluetoothServiceUUID[];
  }
  
  interface BluetoothLEScanFilter {
    name?: string;
  }
  
  type BluetoothServiceUUID = string;
  type BluetoothCharacteristicUUID = string;
}

interface PrintOptions {
  deviceName?: string;
  paperWidth?: number; // en mm
  encoding?: string;
}

interface TicketData {
  empresaNombre?: string;
  empresaDireccion?: string;
  empresaTelefono?: string;
  fecha: string;
  hora: string;
  clienteNombre: string;
  clienteCodigo: string;
  monto: number;
  tipoPago: string;
  referencia: string;
  gestor: string;
  ubicacion?: string;
}

class BluetoothPrinter {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  async connect(deviceName?: string): Promise<boolean> {
    try {
      if (!navigator.bluetooth) {
        throw new Error('Bluetooth no soportado en este navegador');
      }

      // Solicitar dispositivo Bluetooth
      this.device = await navigator.bluetooth.requestDevice({
        filters: deviceName ? [{ name: deviceName }] : [],
        acceptAllDevices: !deviceName,
        optionalServices: ['0000180f-0000-1000-8000-00805f9b34fb'] // Battery service como ejemplo
      });

      if (!this.device.gatt) {
        throw new Error('GATT no disponible');
      }

      // Conectar al dispositivo
      const server = await this.device.gatt.connect();
      
      // Aquí necesitarías los servicios específicos de tu impresora
      // const service = await server.getPrimaryService('service-uuid');
      // this.characteristic = await service.getCharacteristic('characteristic-uuid');

      console.log('Conectado a impresora Bluetooth:', this.device.name);
      return true;

    } catch (error) {
      console.error('Error conectando a impresora Bluetooth:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.device?.gatt?.connected) {
        await this.device.gatt.disconnect();
      }
      this.device = null;
      this.characteristic = null;
    } catch (error) {
      console.error('Error desconectando impresora:', error);
    }
  }

  async print(ticketData: TicketData, options: PrintOptions = {}): Promise<boolean> {
    try {
      if (!this.isConnected()) {
        throw new Error('No hay conexión con la impresora');
      }

      const ticketContent = this.formatTicket(ticketData, options);
      
      // Simular impresión (reemplazar con código real de impresora)
      console.log('Imprimiendo ticket:', ticketContent);
      
      // Aquí enviarías los datos a la impresora vía Bluetooth
      // if (this.characteristic) {
      //   const encoder = new TextEncoder();
      //   const data = encoder.encode(ticketContent);
      //   await this.characteristic.writeValue(data);
      // }

      return true;

    } catch (error) {
      console.error('Error imprimiendo ticket:', error);
      return false;
    }
  }

  private isConnected(): boolean {
    return this.device?.gatt?.connected === true;
  }

  private formatTicket(data: TicketData, options: PrintOptions): string {
    const width = options.paperWidth || 58; // 58mm por defecto
    const separator = '='.repeat(32);
    
    let ticket = '';
    
    // Encabezado
    if (data.empresaNombre) {
      ticket += this.centerText(data.empresaNombre, 32) + '\n';
    } else {
      ticket += this.centerText('SISTEMA ERP', 32) + '\n';
    }
    
    if (data.empresaDireccion) {
      ticket += this.centerText(data.empresaDireccion, 32) + '\n';
    }
    
    if (data.empresaTelefono) {
      ticket += this.centerText(data.empresaTelefono, 32) + '\n';
    }
    
    ticket += separator + '\n';
    ticket += this.centerText('COMPROBANTE DE PAGO', 32) + '\n';
    ticket += separator + '\n\n';

    // Información del cliente
    ticket += `Cliente: ${data.clienteNombre}\n`;
    ticket += `Codigo: ${data.clienteCodigo}\n\n`;

    // Información del pago
    ticket += `Fecha: ${data.fecha}\n`;
    ticket += `Hora: ${data.hora}\n`;
    ticket += `Referencia: ${data.referencia}\n`;
    ticket += `Tipo: ${data.tipoPago}\n\n`;

    // Monto
    ticket += separator + '\n';
    ticket += this.rightAlign(`TOTAL: $${data.monto.toFixed(2)}`, 32) + '\n';
    ticket += separator + '\n\n';

    // Información adicional
    ticket += `Gestor: ${data.gestor}\n`;
    
    if (data.ubicacion) {
      ticket += `Ubicacion: ${data.ubicacion}\n`;
    }
    
    ticket += '\n';
    ticket += this.centerText('¡GRACIAS POR SU PAGO!', 32) + '\n';
    ticket += this.centerText('Conserve este comprobante', 32) + '\n\n';

    // Espacios finales
    ticket += '\n\n\n';

    return ticket;
  }

  private centerText(text: string, width: number): string {
    if (text.length >= width) return text.substring(0, width);
    const padding = Math.floor((width - text.length) / 2);
    return ' '.repeat(padding) + text + ' '.repeat(width - text.length - padding);
  }

  private rightAlign(text: string, width: number): string {
    if (text.length >= width) return text.substring(0, width);
    return ' '.repeat(width - text.length) + text;
  }

  // Comandos ESC/POS comunes para impresoras térmicas
  private getESCPOSCommands() {
    return {
      INIT: '\x1B\x40', // Inicializar impresora
      FEED: '\x0A', // Avance de línea
      CUT: '\x1D\x56\x00', // Cortar papel
      ALIGN_CENTER: '\x1B\x61\x01', // Centrar texto
      ALIGN_LEFT: '\x1B\x61\x00', // Alinear izquierda
      ALIGN_RIGHT: '\x1B\x61\x02', // Alinear derecha
      BOLD_ON: '\x1B\x45\x01', // Negrita ON
      BOLD_OFF: '\x1B\x45\x00', // Negrita OFF
      UNDERLINE_ON: '\x1B\x2D\x01', // Subrayado ON
      UNDERLINE_OFF: '\x1B\x2D\x00', // Subrayado OFF
      DOUBLE_HEIGHT: '\x1B\x21\x10', // Doble altura
      NORMAL_SIZE: '\x1B\x21\x00' // Tamaño normal
    };
  }
}

// Singleton de la impresora
const bluetoothPrinterInstance = new BluetoothPrinter();

// Hook para usar la impresora Bluetooth
export const useBluetoothPrinter = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);

  const connect = async (deviceName?: string): Promise<boolean> => {
    setIsConnecting(true);
    try {
      const success = await bluetoothPrinterInstance.connect(deviceName);
      setIsConnected(success);
      if (success) {
        setDeviceName(deviceName || 'Dispositivo Bluetooth');
      }
      return success;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async (): Promise<void> => {
    await bluetoothPrinterInstance.disconnect();
    setIsConnected(false);
    setDeviceName(null);
  };

  const print = async (ticketData: TicketData, options?: PrintOptions): Promise<boolean> => {
    return await bluetoothPrinterInstance.print(ticketData, options);
  };

  return {
    isConnected,
    isConnecting,
    deviceName,
    connect,
    disconnect,
    print
  };
};

export { BluetoothPrinter, bluetoothPrinterInstance as bluetoothPrinter };
export type { TicketData, PrintOptions };
