import {
  ContpaqiCliente,
  ContpaqiProducto,
  ContpaqiAgente,
  ContpaqiAlmacen,
  ContpaqiConcepto,
  ContpaqiDocumento,
  ContpaqiMovimiento,
  CrearClienteRequest,
  CrearDocumentoRequest,
  AfectarDocumentoRequest,
  TimbrarDocumentoRequest,
  CancelarDocumentoSatRequest,
  RegistrarPagoRequest,
  RegistrarPagoResponse,
} from './contpaqi-types';

export class ContpaqiClient {
  private static instance: ContpaqiClient;
  private baseUrl: string;
  private apiKey: string;
  private companyId: string;

  private constructor() {
    this.baseUrl = process.env.CONTPAQI_API_URL || 'http://localhost:5000/api';
    this.apiKey = process.env.CONTPAQI_API_KEY || '';
    this.companyId = process.env.CONTPAQI_COMPANY_ID || 'FERRE_COLORS';
  }

  public static getInstance(): ContpaqiClient {
    if (!ContpaqiClient.instance) {
      ContpaqiClient.instance = new ContpaqiClient();
    }
    return ContpaqiClient.instance;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      'X-Company-Id': this.companyId,
      'X-Contpaqi-Empresa': this.companyId,
    };
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    isRaw = false
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: this.getHeaders(),
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      console.log(`[CONTPAQi Client] ${method} ${url}`);
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[CONTPAQi Client Error] ${response.status}: ${errorText}`);
        throw new Error(`CONTPAQi API Error (${response.status}): ${errorText || response.statusText}`);
      }

      if (isRaw) {
        return (await response.arrayBuffer()) as unknown as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      console.error(`[CONTPAQi Client Exception] Request failed to ${url}:`, error);
      throw error;
    }
  }

  // --- SISTEMA ---
  public async verificarConexion(): Promise<{
    conectado: boolean;
    empresa: string;
    sdkInicializado: boolean;
    sqlConectado: boolean;
    mensaje: string;
  }> {
    return this.request<{
      conectado: boolean;
      empresa: string;
      sdkInicializado: boolean;
      sqlConectado: boolean;
      mensaje: string;
    }>('/health/verificar');
  }

  // --- CLIENTES ---
  public async getClientes(tipo?: number, estatus?: number): Promise<ContpaqiCliente[]> {
    const params = new URLSearchParams();
    if (tipo !== undefined) params.append('tipo', tipo.toString());
    if (estatus !== undefined) params.append('estatus', estatus.toString());
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<ContpaqiCliente[]>(`/clientes${query}`);
  }

  public async getCliente(codigo: string): Promise<ContpaqiCliente> {
    return this.request<ContpaqiCliente>(`/clientes/${encodeURIComponent(codigo)}`);
  }

  public async crearCliente(data: CrearClienteRequest): Promise<{ id: number; codigo: string }> {
    return this.request<{ id: number; codigo: string }>('/clientes', 'POST', data);
  }

  // --- PRODUCTOS ---
  public async getProductos(busqueda?: string): Promise<ContpaqiProducto[]> {
    const query = busqueda ? `?busqueda=${encodeURIComponent(busqueda)}` : '';
    return this.request<ContpaqiProducto[]>(`/productos${query}`);
  }

  public async getProducto(codigo: string): Promise<ContpaqiProducto> {
    return this.request<ContpaqiProducto>(`/productos/${encodeURIComponent(codigo)}`);
  }

  // --- AGENTES ---
  public async getAgentes(): Promise<ContpaqiAgente[]> {
    const raw = await this.request<any[]>('/agentes');
    return raw.map((a) => ({
      id: a.cidagente,
      codigo: a.ccodigoagente?.trim(),
      nombre: a.cnombreagente?.trim(),
      tipo: a.ctipo,
    }));
  }

  // --- ALMACENES ---
  public async getAlmacenes(): Promise<ContpaqiAlmacen[]> {
    const raw = await this.request<any[]>('/almacenes');
    return raw.map((a) => ({
      id: a.cidalmacen,
      codigo: a.ccodigoalmacen?.trim(),
      nombre: a.cnombrealmacen?.trim(),
    }));
  }

  // --- CONCEPTOS ---
  public async getConceptos(): Promise<ContpaqiConcepto[]> {
    const raw = await this.request<any[]>('/conceptos');
    return raw.map((c) => ({
      id: c.cidconceptodocumento,
      codigo: c.ccodigoconcepto?.trim(),
      nombre: c.cnombreconcepto?.trim(),
      naturaleza: c.cnaturaleza,
      seriePorOmision: c.cserieporomision?.trim(),
    }));
  }

  // --- DOCUMENTOS ---
  public async getDocumentos(filters: {
    fechaInicio?: string;
    fechaFin?: string;
    codigoConcepto?: string;
    codigoCliente?: string;
    limit?: number;
    offset?: number;
  }): Promise<ContpaqiDocumento[]> {
    const params = new URLSearchParams();
    if (filters.fechaInicio) params.append('fechaInicio', filters.fechaInicio);
    if (filters.fechaFin) params.append('fechaFin', filters.fechaFin);
    if (filters.codigoConcepto) params.append('codigoConcepto', filters.codigoConcepto);
    if (filters.codigoCliente) params.append('codigoCliente', filters.codigoCliente);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    return this.request<ContpaqiDocumento[]>(`/documentos?${params.toString()}`);
  }

  public async getDocumento(id: number): Promise<ContpaqiDocumento> {
    return this.request<ContpaqiDocumento>(`/documentos/${id}`);
  }

  public async getMovimientos(id: number): Promise<ContpaqiMovimiento[]> {
    return this.request<ContpaqiMovimiento[]>(`/documentos/${id}/movimientos`);
  }

  public async getDocumentosPorCliente(codigoCliente: string): Promise<ContpaqiDocumento[]> {
    return this.request<ContpaqiDocumento[]>(`/documentos/cliente/${encodeURIComponent(codigoCliente)}`);
  }

  public async crearDocumento(data: CrearDocumentoRequest): Promise<{ id: number }> {
    return this.request<{ id: number }>('/documentos', 'POST', data);
  }

  public async afectarDocumento(data: AfectarDocumentoRequest): Promise<{ mensaje: string }> {
    return this.request<{ mensaje: string }>('/documentos/afectar', 'POST', data);
  }

  public async cancelarDocumento(data: AfectarDocumentoRequest): Promise<{ mensaje: string }> {
    return this.request<{ mensaje: string }>('/documentos/cancelar', 'POST', data);
  }

  public async timbrarDocumento(data: TimbrarDocumentoRequest): Promise<{ mensaje: string; jobId: string; referencia: string }> {
    return this.request<{ mensaje: string; jobId: string; referencia: string }>('/documentos/timbrar', 'POST', data);
  }

  public async cancelarDocumentoSat(data: CancelarDocumentoSatRequest): Promise<{ mensaje: string }> {
    return this.request<{ mensaje: string }>('/documentos/cancelar-sat', 'POST', data);
  }

  public async generarXml(codigoConcepto: string, serie: string, folio: number): Promise<{ mensaje: string; ruta: string }> {
    const params = new URLSearchParams({
      codigoConcepto,
      serie,
      folio: folio.toString(),
    });
    return this.request<{ mensaje: string; ruta: string }>(`/documentos/xml?${params.toString()}`);
  }

  public async descargarXml(id: number): Promise<ArrayBuffer> {
    return this.request<ArrayBuffer>(`/documentos/${id}/xml/descargar`, 'GET', undefined, true);
  }

  public async descargarPdf(id: number): Promise<ArrayBuffer> {
    return this.request<ArrayBuffer>(`/documentos/${id}/pdf/descargar`, 'GET', undefined, true);
  }

  // --- PAGOS ---
  public async registrarPago(data: RegistrarPagoRequest): Promise<RegistrarPagoResponse> {
    return this.request<RegistrarPagoResponse>('/pagos', 'POST', data);
  }
}
