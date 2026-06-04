
// Evolution API Service
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

export interface EvolutionConfig {
  baseUrl: string;
  instanceName: string;
  token: string;
}

class EvolutionAPIService {
  private config: EvolutionConfig;

  constructor(config: EvolutionConfig) {
    this.config = config;
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'apikey': this.config.token,
    };
  }

  async sendMessage(data: WhatsAppMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const payload = {
        number: data.number,
        text: data.message,
      };

      const response = await fetch(`${this.config.baseUrl}/message/sendText/${this.config.instanceName}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          messageId: result.key?.id || 'unknown',
        };
      } else {
        return {
          success: false,
          error: result.message || 'Error al enviar mensaje',
        };
      }
    } catch (error) {
      console.error('Evolution API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  async sendMedia(data: WhatsAppMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const payload = {
        number: data.number,
        mediaMessage: {
          media: data.mediaUrl,
          mediaType: data.mediaType || 'image',
          fileName: data.fileName || 'archivo',
          caption: data.message,
        },
      };

      const response = await fetch(`${this.config.baseUrl}/message/sendMedia/${this.config.instanceName}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          messageId: result.key?.id || 'unknown',
        };
      } else {
        return {
          success: false,
          error: result.message || 'Error al enviar media',
        };
      }
    } catch (error) {
      console.error('Evolution API Media Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  async getContacts(): Promise<{ success: boolean; contacts?: WhatsAppContact[]; error?: string }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/chat/fetchContacts/${this.config.instanceName}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const result = await response.json();

      if (response.ok) {
        const contacts = result.map((contact: any) => ({
          id: contact.id,
          name: contact.pushName || contact.verifiedName || contact.id,
          number: contact.id.replace('@s.whatsapp.net', ''),
          profilePic: contact.profilePicUrl,
        }));

        return {
          success: true,
          contacts,
        };
      } else {
        return {
          success: false,
          error: result.message || 'Error al obtener contactos',
        };
      }
    } catch (error) {
      console.error('Evolution API Contacts Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  async getInstanceStatus(): Promise<{ success: boolean; status?: string; error?: string }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/instance/fetchInstance/${this.config.instanceName}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          status: result.instance?.state || 'unknown',
        };
      } else {
        return {
          success: false,
          error: result.message || 'Error al obtener estado',
        };
      }
    } catch (error) {
      console.error('Evolution API Status Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }
}

export default EvolutionAPIService;
