export interface ContpaqiCliente {
  id: number;
  codigo: string;
  razonSocial: string;
  rfc: string;
  tipo: number; // 1=Cliente, 2=Proveedor, 3=Ambos
  estatus: number; // 0=Activo, 1=Baja, 2=Todos
  limiteCredito: number;
  diasCredito: number;
  usoCfdi?: string;
  email?: string;
  metodoPago?: string;
  cuentaPago?: string;
  regimenFiscal?: string;
  codigoPostalFiscal?: string;
}

export interface ContpaqiProducto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  precio1: number;
  precio2?: number;
  precio3?: number;
  precio4?: number;
  precio5?: number;
  costoUltimo: number;
  claveSat?: string;
  claveUnidadSat?: string;
}

export interface ContpaqiAgente {
  id: number;
  codigo: string;
  nombre: string;
  tipo: number; // 1=Vendedor, 2=Cobrador
}

export interface ContpaqiAlmacen {
  id: number;
  codigo: string;
  nombre: string;
}

export interface ContpaqiConcepto {
  id: number;
  codigo: string;
  nombre: string;
  naturaleza: number;
  seriePorOmision: string;
}

export interface ContpaqiDocumento {
  id: number;
  idConceptoDocumento: number;
  serie: string;
  folio: number;
  fecha: string;
  idClienteProveedor: number;
  razonSocial: string;
  rfc: string;
  referencia?: string;
  observaciones?: string;
  neto: number;
  impuesto1: number;
  total: number;
  pendiente: number;
  metodoPago?: string;
  cuentaPago?: string;
  guidDocumento?: string;
  cancelado: number;
  uuid?: string; // Si ya está timbrado
}

export interface ContpaqiMovimiento {
  id: number;
  idDocumento: number;
  numeroMovimiento: number;
  idProducto: number;
  idAlmacen: number;
  unidades: number;
  precio: number;
  neto: number;
  impuesto1: number;
  total: number;
  referencia?: string;
  observaciones?: string | null;
}

export interface CrearClienteRequest {
  codigo: string;
  razonSocial: string;
  rfc: string;
  tipo: number; // 1=Cliente, 2=Proveedor
  limiteCredito?: number;
  diasCredito?: number;
  usoCfdi?: string;
  email?: string;
  metodoPago?: string;
  regimenFiscal?: string;
  codigoPostalFiscal?: string;
  telefono1?: string;
  calle?: string;
  numeroExterior?: string;
  numeroInterior?: string;
  colonia?: string;
  codigoPostal?: string;
  municipio?: string;
  estado?: string;
  pais?: string;
}

export interface CrearDocumentoRequest {
  codigoConcepto: string;
  codigoClienteProveedor: string;
  codigoAgente?: string;
  referencia?: string;
  observaciones?: string;
  fecha: string; // YYYY-MM-DD
  movimientos: {
    codigoProducto: string;
    codigoAlmacen: string;
    unidades: number;
    precio: number;
    referencia?: string;
    observaciones?: string;
  }[];
}

export interface AfectarDocumentoRequest {
  codigoConcepto: string;
  serie: string;
  folio: number;
}

export interface TimbrarDocumentoRequest {
  codigoConcepto: string;
  serie: string;
  folio: number;
  password?: string;
}

export interface CancelarDocumentoSatRequest {
  codigoConcepto: string;
  serie: string;
  folio: number;
  motivo: string; // 01, 02, 03, 04 (claves del SAT)
  uuidSustituto?: string;
}

export interface RegistrarPagoRequest {
  codigoCliente: string;
  monto: number;
  fecha: string;
  folioTicket: string;
  referencia?: string;
  observaciones?: string;
  codigoConceptoAbono?: string;
  codigoConceptoCargo?: string;
}

export interface RegistrarPagoResponse {
  exito: boolean;
  idPago?: number;
  mensaje?: string;
  folioDocumento?: string;
}

export interface ContpaqiWebhookEvent {
  id: string;
  evento: string;
  fecha: string;
  payload: any;
}
