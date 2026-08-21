import https from 'https';

export class AlpacaService {
  private static getCredentials() {
    const keyId = process.env.ALPACA_API_KEY;
    const secretKey = process.env.ALPACA_SECRET_KEY;
    const baseUrl = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets';

    return { keyId, secretKey, baseUrl };
  }

  private static getHeaders() {
    const { keyId, secretKey } = this.getCredentials();

    if (!keyId || !secretKey) {
      throw new Error('Alpaca API credentials missing. Please configure ALPACA_API_KEY and ALPACA_SECRET_KEY in Settings.');
    }

    return {
      'APCA-API-KEY-ID': keyId,
      'APCA-API-SECRET-KEY': secretKey,
      'Content-Type': 'application/json',
    };
  }

  private static getBaseHost(): string {
    const { baseUrl } = this.getCredentials();
    try {
      return new URL(baseUrl).hostname;
    } catch {
      return 'paper-api.alpaca.markets';
    }
  }

  static async request(path: string, method: string = 'GET', body?: unknown): Promise<unknown> {
    const headers = this.getHeaders();
    const hostname = this.getBaseHost();

    return new Promise((resolve, reject) => {
      const options = {
        hostname,
        port: 443,
        path,
        method,
        headers,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(data);
            }
          } else {
            reject({
              statusCode: res.statusCode,
              message: data || `Alpaca API error with status ${res.statusCode}`,
            });
          }
        });
      });

      req.on('error', (err) => reject(err));

      if (body) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }

      req.end();
    });
  }

  static async getAccount() {
    return this.request('/v2/account');
  }

  static async getPositions() {
    return this.request('/v2/positions');
  }

  static async getOrders(status: string = 'all', limit: number = 50) {
    return this.request(`/v2/orders?status=${status}&limit=${limit}`);
  }

  static async getPortfolioHistory(period: string = '1M', timeframe: string = '1D') {
    return this.request(`/v2/account/portfolio/history?period=${period}&timeframe=${timeframe}`);
  }
}
