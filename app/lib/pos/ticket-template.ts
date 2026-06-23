/**
 * Utilidades para construir comandos ESC/POS binarios para impresoras térmicas de 80mm.
 * Limpia acentos y caracteres especiales para asegurar compatibilidad ASCII universal.
 */

// Comandos ESC/POS estándar
const ESC = 0x1B;
const GS = 0x1D;

export const ESC_POS_COMMANDS = {
  INIT: new Uint8Array([ESC, 0x40]), // Inicializar
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]),
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),
  DOUBLE_SIZE_ON: new Uint8Array([ESC, 0x21, 0x30]), // Texto doble alto y ancho
  DOUBLE_HEIGHT_ON: new Uint8Array([ESC, 0x21, 0x10]), // Texto doble alto
  NORMAL_SIZE: new Uint8Array([ESC, 0x21, 0x00]),
  PAPER_CUT: new Uint8Array([GS, 0x56, 0x42, 0x00]), // Corte parcial/completo
  OPEN_CASH_DRAWER: new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xFA]), // Pulso en pin 2
  LINE_FEED: new Uint8Array([0x0A]), // Salto de línea
};

// Limpia acentos y eñes para evitar símbolos raros en la impresora
function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N')
    .replace(/[^a-zA-Z0-9\s\-\.\,\:\#\$\%\&\/\(\)\=\?\*\+\@\[\]\_]/g, ''); // Deja solo ASCII seguro
}

// Formatea una columna a un ancho específico con espacios de relleno
function padString(str: string, length: number, align: 'left' | 'right' | 'center' = 'left'): string {
  const sanitized = sanitizeText(str);
  if (sanitized.length >= length) {
    return sanitized.substring(0, length);
  }
  
  const diff = length - sanitized.length;
  if (align === 'right') {
    return ' '.repeat(diff) + sanitized;
  } else if (align === 'center') {
    const leftPad = Math.floor(diff / 2);
    const rightPad = diff - leftPad;
    return ' '.repeat(leftPad) + sanitized + ' '.repeat(rightPad);
  } else {
    return sanitized + ' '.repeat(diff);
  }
}

// Construye una fila alineada para el ticket de 48 caracteres de ancho (80mm)
// Formato: "CANT  PRODUCTO                     P.UNIT   IMPORTE"
// Anchos:   4     22                           10       12
function formatProductRow(cant: number, nombre: string, pUnit: number, total: number): string {
  const cantStr = cant.toFixed(1); // ej: "2.0"
  const pUnitStr = `$${pUnit.toFixed(2)}`;
  const totalStr = `$${total.toFixed(2)}`;
  
  // Si el nombre del producto es largo, lo cortamos para que quepa en la primera línea,
  // y lo que sobra se podría escribir en otra línea
  const maxNombreLen = 22;
  const nombreCortado = nombre.substring(0, maxNombreLen);
  
  let line = padString(cantStr, 5, 'left') + 
             padString(nombreCortado, maxNombreLen, 'left') + ' ' +
             padString(pUnitStr, 10, 'right') +
             padString(totalStr, 11, 'right');
             
  if (nombre.length > maxNombreLen) {
    // Agregar el resto del nombre abajo alineado con la columna del nombre
    const restoNombre = nombre.substring(maxNombreLen);
    const lineasResto = restoNombre.match(new RegExp(`.{1,${maxNombreLen}}`, 'g')) || [];
    for (const subLine of lineasResto) {
      line += '\n' + ' '.repeat(5) + padString(subLine, maxNombreLen, 'left');
    }
  }
  
  return line;
}

// Junta buffers Uint8Array
function concatBuffers(arrays: Uint8Array[]): Uint8Array {
  let totalLength = 0;
  for (const arr of arrays) {
    totalLength += arr.length;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Genera el stream binario de comandos ESC/POS para imprimir un ticket de venta.
 */
export function generateTicketESCPOSTemplate(data: any): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];

  const writeText = (text: string) => parts.push(encoder.encode(text));
  const writeCmd = (cmd: Uint8Array) => parts.push(cmd);
  const writeLine = (text: string = '') => parts.push(encoder.encode(sanitizeText(text) + '\n'));

  // 1. Inicializar
  writeCmd(ESC_POS_COMMANDS.INIT);
  writeCmd(ESC_POS_COMMANDS.ALIGN_CENTER);

  // 2. Encabezado Empresa
  writeCmd(ESC_POS_COMMANDS.DOUBLE_SIZE_ON);
  writeCmd(ESC_POS_COMMANDS.BOLD_ON);
  writeLine(data.empresa.nombre);
  writeCmd(ESC_POS_COMMANDS.NORMAL_SIZE);
  writeCmd(ESC_POS_COMMANDS.BOLD_OFF);
  
  writeLine(`RFC: ${data.empresa.rfc}`);
  writeLine(data.sucursal.nombre);
  writeLine(data.sucursal.direccion);
  writeLine(`Tel: ${data.sucursal.telefono}`);
  writeLine('-'.repeat(48));

  // 3. Info Venta
  writeCmd(ESC_POS_COMMANDS.ALIGN_LEFT);
  writeLine(`TICKET:  ${data.ticket.numeroTicket}`);
  writeLine(`FECHA:   ${new Date(data.ticket.fecha).toLocaleString()}`);
  writeLine(`CAJERO:  ${data.ticket.cajero}`);
  writeLine(`CAJA:    ${data.ticket.terminal}`);
  writeLine(`CLIENTE: ${data.cliente.nombre} (${data.cliente.codigo})`);
  writeLine(`RFC:     ${data.cliente.rfc}`);
  writeLine('='.repeat(48));

  // 4. Cabecera Tabla Productos
  // Columnas: CANT  DESCRIPCION                 P.UNIT   IMPORTE
  writeCmd(ESC_POS_COMMANDS.BOLD_ON);
  writeLine(
    padString('CANT', 5, 'left') + 
    padString('PRODUCTO', 22, 'left') + ' ' +
    padString('P.UNIT', 10, 'right') +
    padString('TOTAL', 11, 'right')
  );
  writeCmd(ESC_POS_COMMANDS.BOLD_OFF);
  writeLine('-'.repeat(48));

  // 5. Listado de Productos
  for (const item of data.conceptos) {
    writeLine(formatProductRow(item.cantidad, item.nombre, item.precioUnitario, item.importe));
  }
  writeLine('-'.repeat(48));

  // 6. Totales
  writeCmd(ESC_POS_COMMANDS.ALIGN_RIGHT);
  writeLine(`SUBTOTAL: ${padString(`$${data.totales.subtotal.toFixed(2)}`, 15, 'right')}`);
  writeLine(`IVA (16%): ${padString(`$${data.totales.iva.toFixed(2)}`, 15, 'right')}`);
  if (data.totales.descuento > 0) {
    writeLine(`DESCUENTO: ${padString(`-$${data.totales.descuento.toFixed(2)}`, 15, 'right')}`);
  }
  
  writeCmd(ESC_POS_COMMANDS.BOLD_ON);
  writeCmd(ESC_POS_COMMANDS.DOUBLE_HEIGHT_ON);
  writeLine(`TOTAL: ${padString(`$${data.totales.total.toFixed(2)}`, 15, 'right')}`);
  writeCmd(ESC_POS_COMMANDS.NORMAL_SIZE);
  writeCmd(ESC_POS_COMMANDS.BOLD_OFF);
  writeLine('-'.repeat(48));

  // Desglose de pago
  if (data.totales.pagoEfectivo > 0) {
    writeLine(`EFECTIVO RECIBIDO: ${padString(`$${data.totales.pagoEfectivo.toFixed(2)}`, 15, 'right')}`);
    writeLine(`CAMBIO:            ${padString(`$${data.totales.cambio.toFixed(2)}`, 15, 'right')}`);
  }
  if (data.totales.pagoTarjeta > 0) {
    writeLine(`PAGO TARJETA:      ${padString(`$${data.totales.pagoTarjeta.toFixed(2)}`, 15, 'right')}`);
    writeLine(`AUT/REF:           ${padString(data.totales.referenciaTerminal || 'N/A', 15, 'right')}`);
  }
  writeLine('='.repeat(48));

  // 7. Mensaje de agradecimiento
  writeCmd(ESC_POS_COMMANDS.ALIGN_CENTER);
  writeCmd(ESC_POS_COMMANDS.BOLD_ON);
  writeLine('GRACIAS POR SU COMPRA!');
  writeCmd(ESC_POS_COMMANDS.BOLD_OFF);
  writeLine('Conserve este ticket para cualquier aclaracion.');
  writeLine('Este no es un comprobante fiscal CFDI.');
  writeLine('Si requiere factura, solicitela el mismo dia.');
  
  // Espaciado final y corte de papel
  writeLine('\n\n\n\n');
  writeCmd(ESC_POS_COMMANDS.PAPER_CUT);

  return concatBuffers(parts);
}

/**
 * Genera el stream binario de comandos ESC/POS para imprimir un reporte de corte de caja (Z-cut).
 */
export function generateZCutESCPOSTemplate(data: any): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];

  const writeCmd = (cmd: Uint8Array) => parts.push(cmd);
  const writeLine = (text: string = '') => parts.push(encoder.encode(sanitizeText(text) + '\n'));

  const s = data.sesion;
  const c = data.calculos;

  // 1. Inicializar
  writeCmd(ESC_POS_COMMANDS.INIT);
  writeCmd(ESC_POS_COMMANDS.ALIGN_CENTER);

  // 2. Título de Corte
  writeCmd(ESC_POS_COMMANDS.DOUBLE_SIZE_ON);
  writeCmd(ESC_POS_COMMANDS.BOLD_ON);
  writeLine('CORTE DE CAJA (CORTE Z)');
  writeCmd(ESC_POS_COMMANDS.NORMAL_SIZE);
  writeCmd(ESC_POS_COMMANDS.BOLD_OFF);
  writeLine(s.sucursal.nombre);
  writeLine('-'.repeat(48));

  // 3. Info Sesión
  writeCmd(ESC_POS_COMMANDS.ALIGN_LEFT);
  writeLine(`CAJERO:    ${s.cajero.firstName || ''} ${s.cajero.lastName || ''}`.trim() || s.cajero.name);
  writeLine(`TERMINAL:  ${s.numeroTerminal || 'Caja 1'}`);
  writeLine(`APERTURA:  ${new Date(s.fechaApertura).toLocaleString()}`);
  writeLine(`CIERRE:    ${s.fechaCierre ? new Date(s.fechaCierre).toLocaleString() : 'SESION ACTIVA'}`);
  writeLine(`ESTADO:    ${s.activa ? 'ABIERTA' : 'CERRADA'}`);
  writeLine('='.repeat(48));

  // 4. Desglose del Sistema
  writeCmd(ESC_POS_COMMANDS.BOLD_ON);
  writeLine('RESUMEN DE MOVIMIENTOS EN CAJA');
  writeCmd(ESC_POS_COMMANDS.BOLD_OFF);
  writeLine('-'.repeat(48));

  const formatLine = (label: string, value: number) => {
    return padString(label, 30, 'left') + padString(`$${value.toFixed(2)}`, 18, 'right');
  };

  writeLine(formatLine('(+) FONDO DE APERTURA:', c.montoApertura));
  writeLine(formatLine('(+) VENTAS EFECTIVO:', c.efectivoVentas));
  writeLine(formatLine('(+) DEPOSITOS DE EFECTIVO:', c.depositos));
  writeLine(formatLine('(-) RETIROS DE EFECTIVO:', c.retiros));
  writeLine(formatLine('(-) DEVOLUCIONES EFECTIVO:', c.devoluciones));
  writeLine('-'.repeat(48));

  writeCmd(ESC_POS_COMMANDS.BOLD_ON);
  writeLine(formatLine('(=) EFECTIVO ESPERADO EN CAJA:', c.efectivoEsperadoSistema));
  writeCmd(ESC_POS_COMMANDS.BOLD_OFF);
  writeLine('-'.repeat(48));
  
  writeLine(formatLine('(+) VENTAS CON TARJETA:', c.tarjetaVentas));
  writeCmd(ESC_POS_COMMANDS.BOLD_ON);
  writeLine(formatLine('(=) TOTAL VENTAS TURNO:', c.totalVentas));
  writeLine(`TOTAL TRANSACCIONES: ${padString(c.totalTransacciones.toString(), 27, 'right')}`);
  writeCmd(ESC_POS_COMMANDS.BOLD_OFF);
  writeLine('='.repeat(48));

  // 5. Comparativa Cierre (si ya está cerrada)
  if (!s.activa) {
    writeCmd(ESC_POS_COMMANDS.BOLD_ON);
    writeLine('AUDITORIA DE CIERRE');
    writeCmd(ESC_POS_COMMANDS.BOLD_OFF);
    writeLine('-'.repeat(48));
    writeLine(formatLine('EFECTIVO EN CAJA DECLARADO:', s.montoEfectivoDeclarado));
    writeLine(formatLine('EFECTIVO EN CAJA ESPERADO:', s.totalEfectivoSistema));
    writeLine('-'.repeat(48));
    
    writeCmd(ESC_POS_COMMANDS.BOLD_ON);
    writeCmd(ESC_POS_COMMANDS.DOUBLE_HEIGHT_ON);
    
    const diffLabel = s.diferencia >= 0 ? 'SOBRANTE:' : 'FALTANTE:';
    writeLine(padString(diffLabel, 30, 'left') + padString(`$${s.diferencia.toFixed(2)}`, 18, 'right'));
    
    writeCmd(ESC_POS_COMMANDS.NORMAL_SIZE);
    writeCmd(ESC_POS_COMMANDS.BOLD_OFF);
    writeLine('-'.repeat(48));

    if (s.observacionesCierre) {
      writeLine('Observaciones de Cierre:');
      writeLine(s.observacionesCierre);
      writeLine('-'.repeat(48));
    }
  }

  // 6. Firmas
  writeCmd(ESC_POS_COMMANDS.ALIGN_CENTER);
  writeLine('\n\n\n');
  writeLine('_'.repeat(20) + ' '.repeat(8) + '_'.repeat(20));
  writeLine('Firma Cajero' + ' '.repeat(16) + 'Firma Supervisor');

  // Espaciado final y corte de papel
  writeLine('\n\n\n\n');
  writeCmd(ESC_POS_COMMANDS.PAPER_CUT);

  return concatBuffers(parts);
}
