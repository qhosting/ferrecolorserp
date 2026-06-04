// WAHA API Service (WhatsApp HTTP API - dev.waha.dev)

export interface WhatsAppMessage {
  number: string;
  message: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'document' | 'audio' | 'video';
  fileName?: string;
}

export interface WhatsAppContact {
  id: string;
  name: string;
  number: string;
  profilePic?: string;
  lastSeen?: Date;
}

export interface WahaConfig {
  baseUrl: string;
  sessionName: string;
  apiKey: string;
}

class WahaAPIService {
  private config: WahaConfig;

  constructor(config: WahaConfig) {
    this.config = config;
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.config.apiKey) {
      headers['X-Api-Key'] = this.config.apiKey;
    }
    return headers;
  }

  async sendMessage(data: WhatsAppMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // WAHA espera el número en formato internacional con @c.us
      const cleanNumber = data.number.replace(/\D/g, '');
      const chatId = cleanNumber.includes('@') ? cleanNumber : `${cleanNumber}@c.us`;

      const payload = {
        session: this.config.sessionName,
        chatId: chatId,
        text: data.message,
      };

      const response = await fetch(`${this.config.baseUrl}/api/sendText`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          messageId: result.id || 'unknown',
        };
      } else {
        return {
          success: false,
          error: result.message || 'Error al enviar mensaje con WAHA API',
        };
      }
    } catch (error) {
      console.error('WAHA API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  async sendMedia(data: WhatsAppMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const cleanNumber = data.number.replace(/\D/g, '');
      const chatId = cleanNumber.includes('@') ? cleanNumber : `${cleanNumber}@c.us`;

      let mimeType = 'application/octet-stream';
      if (data.mediaType === 'image') mimeType = 'image/jpeg';
      else if (data.mediaType === 'document') mimeType = 'application/pdf';
      else if (data.mediaType === 'audio') mimeType = 'audio/mp3';
      else if (data.mediaType === 'video') mimeType = 'video/mp4';

      const payload = {
        session: this.config.sessionName,
        chatId: chatId,
        file: {
          url: data.mediaUrl,
          filename: data.fileName || 'archivo',
          mimetype: mimeType
        },
        caption: data.message
      };

      const response = await fetch(`${this.config.baseUrl}/api/sendFile`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          messageId: result.id || 'unknown',
        };
      } else {
        return {
          success: false,
          error: result.message || 'Error al enviar archivo con WAHA API',
        };
      }
    } catch (error) {
      console.error('WAHA API Media Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  async getContacts(): Promise<{ success: boolean; contacts?: WhatsAppContact[]; error?: string }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/contacts/all?session=${this.config.sessionName}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const result = await response.json();

      if (response.ok && Array.isArray(result)) {
        const contacts = result.map((contact: any) => ({
          id: contact.id,
          name: contact.name || contact.pushname || contact.id,
          number: contact.id.replace('@c.us', ''),
          profilePic: contact.profilePic || contact.avatarUrl || '',
        }));

        return {
          success: true,
          contacts,
        };
      } else {
        return {
          success: false,
          error: (result && result.message) || 'Error al obtener contactos de WAHA',
        };
      }
    } catch (error) {
      console.error('WAHA API Contacts Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  async getInstanceStatus(): Promise<{ success: boolean; status?: string; error?: string }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/sessions/${this.config.sessionName}`, {
        method: 'GET',
        headers: this.getHeaders(),
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
          error: result.message || 'Error al obtener estado de la sesión WAHA',
        };
      }
    } catch (error) {
      console.error('WAHA API Status Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }
}

export default WahaAPIService;
