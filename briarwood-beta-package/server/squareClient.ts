import { SquareClient } from 'square';

// Always use production environment since we're using production Square credentials
function createSquareClient(accessToken?: string): SquareClient {
  const token = accessToken || process.env.SQUARE_ACCESS_TOKEN;
  
  if (!token) {
    throw new Error('Square API not configured. Please add SQUARE_ACCESS_TOKEN to your secrets.');
  }

  return new SquareClient({
    token,
    baseUrl: 'https://connect.squareup.com',
  });
}

let platformSquareClient: SquareClient | null = null;

export function getSquare(): SquareClient {
  if (!platformSquareClient) {
    platformSquareClient = createSquareClient();
  }
  return platformSquareClient;
}

export function getSquareOAuthClient(): SquareClient {
  return new SquareClient({
    baseUrl: 'https://connect.squareup.com',
  });
}

export function getMerchantSquare(merchantAccessToken: string): SquareClient {
  if (!merchantAccessToken) {
    throw new Error('Merchant access token is required');
  }
  return createSquareClient(merchantAccessToken);
}

export function getSquareApplicationId(): string {
  const appId = process.env.SQUARE_APP_ID || process.env.SQUARE_APPLICATION_ID;
  if (!appId) {
    throw new Error('Square Application ID not configured. Please add SQUARE_APP_ID to your secrets.');
  }
  return appId;
}

export function getSquareApplicationSecret(): string {
  // Prioritize SQUARE_APP_SECRET as it has the correct value
  const secret = process.env.SQUARE_APP_SECRET || process.env.SQUARE_APPLICATION_SECRET;
  if (!secret || !secret.startsWith('sq0csp-')) {
    throw new Error('Square Application Secret not configured correctly. Please add SQUARE_APP_SECRET starting with sq0csp-');
  }
  return secret;
}

export function isSquareConfigured(): boolean {
  const appId = process.env.SQUARE_APP_ID || process.env.SQUARE_APPLICATION_ID;
  return !!(process.env.SQUARE_ACCESS_TOKEN && appId);
}

export function isSquareOAuthConfigured(): boolean {
  const appId = process.env.SQUARE_APP_ID || process.env.SQUARE_APPLICATION_ID;
  const secret = process.env.SQUARE_APP_SECRET || process.env.SQUARE_APPLICATION_SECRET;
  return !!(appId && secret && secret.startsWith('sq0csp-'));
}
