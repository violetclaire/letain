import { SquareClient } from 'square';

const isProduction = process.env.REPLIT_DEPLOYMENT === '1';

function createSquareClient(): SquareClient {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('Square API not configured. Please add SQUARE_ACCESS_TOKEN to your secrets.');
  }

  return new SquareClient({
    token: accessToken,
    environment: isProduction ? 'production' : 'sandbox',
  });
}

let squareClient: SquareClient | null = null;

export function getSquare(): SquareClient {
  if (!squareClient) {
    squareClient = createSquareClient();
  }
  return squareClient;
}

export function getSquareApplicationId(): string {
  const appId = process.env.SQUARE_APPLICATION_ID;
  if (!appId) {
    throw new Error('Square Application ID not configured. Please add SQUARE_APPLICATION_ID to your secrets.');
  }
  return appId;
}

export function isSquareConfigured(): boolean {
  return !!(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_APPLICATION_ID);
}
