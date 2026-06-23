/**
 * Utilidades para conectar e imprimir directamente a impresoras térmicas ESC/POS 
 * utilizando la Web Serial API del navegador (Chrome / Edge).
 */

import { ESC_POS_COMMANDS } from './ticket-template';

/**
 * Verifica si la Web Serial API está disponible en el navegador.
 */
export function isWebSerialSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serial' in navigator;
}

/**
 * Solicita al usuario seleccionar un puerto serial para la impresora térmica.
 */
export async function requestPrinterPort(): Promise<any> {
  if (!isWebSerialSupported()) {
    throw new Error('Web Serial API no está soportada en este navegador. Use Chrome o Edge.');
  }
  // @ts-ignore
  return await navigator.serial.requestPort();
}

/**
 * Envía bytes de comandos binarios crudos a la impresora a través del puerto especificado.
 * Abre el puerto si aún no está abierto.
 * 
 * @param port Puerto serial seleccionado del navegador.
 * @param bytes Secuencia de comandos en Uint8Array.
 * @param baudRate Tasa de baudios (velocidad del puerto). Por defecto es 9600 o 115200 según la marca.
 */
export async function printRawBytes(
  port: any,
  bytes: Uint8Array,
  baudRate: number = 9600
): Promise<void> {
  if (!port) {
    throw new Error('Impresora no especificada o puerto inválido');
  }

  // Si el puerto está cerrado, abrirlo
  // La propiedad 'open' en Web Serial determina si está inicializado.
  // Intentamos abrirlo atrapando el error si ya está abierto.
  try {
    await port.open({ 
      baudRate,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      flowControl: 'none'
    });
  } catch (err: any) {
    // Si dice que el puerto ya está abierto, ignoramos el error y continuamos
    if (!err.message.includes('already open') && !err.message.includes('The port is already open')) {
      throw err;
    }
  }

  if (!port.writable) {
    throw new Error('El puerto de la impresora no está disponible para escritura');
  }

  const writer = port.writable.getWriter();
  try {
    await writer.write(bytes);
    // Dar un breve retardo para que la impresora procese el búfer físico
    await new Promise((resolve) => setTimeout(resolve, 50));
  } finally {
    writer.releaseLock();
  }
}

/**
 * Dispara el pulso eléctrico para abrir el cajón monedero conectado a la impresora (Pin 2).
 */
export async function triggerCashDrawer(port: any, baudRate: number = 9600): Promise<void> {
  await printRawBytes(port, ESC_POS_COMMANDS.OPEN_CASH_DRAWER, baudRate);
}

/**
 * Envía el comando de corte de papel.
 */
export async function triggerPaperCut(port: any, baudRate: number = 9600): Promise<void> {
  await printRawBytes(port, ESC_POS_COMMANDS.PAPER_CUT, baudRate);
}
