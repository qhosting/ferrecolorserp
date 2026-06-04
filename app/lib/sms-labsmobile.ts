
// LabsMobile SMS Service
export interface SMSMessage {
  to: string;
  message: string;
  from?: string;
  scheduleDate?: Date;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
  parts?: number;
}

export interface LabsMobileConfig {
  username: string;
  token: string;
  baseUrl?: string;
}

class LabsMobileSMSService {
  private config: LabsMobileConfig;
  private baseUrl: string;

  constructor(config: LabsMobileConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.labsmobile.com/v1';
  }

  private getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.token}`).toString('base64')}`,
    };
  }

  async sendSMS(data: SMSMessage): Promise<SMSResponse> {
    try {
      // Formatear número de teléfono (remover caracteres no numéricos)
      const phoneNumber = data.to.replace(/\D/g, '');
      
      const payload = {
        recipient: [{
          msisdn: phoneNumber
        }],
        message: {
          msisdn: data.from || null,
          text: data.message
        },
        scheduled_date: data.scheduleDate ? data.scheduleDate.toISOString() : null
      };

      const response = await fetch(`${this.baseUrl}/sms/send`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          messageId: result.subaccount_id || 'unknown',
          cost: result.cost || 0,
          parts: result.parts || 1,
        };
      } else {
        return {
          success: false,
          error: result.message || `Error ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      console.error('LabsMobile SMS Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  async sendBulkSMS(messages: SMSMessage[]): Promise<{ 
    success: boolean; 
    results?: SMSResponse[]; 
    error?: string; 
  }> {
    try {
      const results: SMSResponse[] = [];
      
      // Procesar mensajes en lotes de 10 para no sobrecargar la API
      const batchSize = 10;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        const batchPromises = batch.map(message => this.sendSMS(message));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Pausa entre lotes para respetar límites de API
        if (i + batchSize < messages.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return {
        success: true,
        results,
      };
    } catch (error) {
      console.error('LabsMobile Bulk SMS Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  async getBalance(): Promise<{ success: boolean; balance?: number; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/subaccount/balance`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          balance: result.balance || 0,
        };
      } else {
        return {
          success: false,
          error: result.message || 'Error al obtener balance',
        };
      }
    } catch (error) {
      console.error('LabsMobile Balance Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  async getDeliveryStatus(messageId: string): Promise<{ 
    success: boolean; 
    status?: string; 
    error?: string; 
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/sms/status/${messageId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          status: result.status || 'unknown',
        };
      } else {
        return {
          success: false,
          error: result.message || 'Error al obtener estado',
        };
      }
    } catch (error) {
      console.error('LabsMobile Status Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }
}

export default LabsMobileSMSService;
