/**
 * Whop Integration Configuration
 * Based on Monetization Research v2.1 Strategic Validation
 * 
 * Integration Model: OAuth for external access (React/Vite app)
 * Alternative: iframe embedding in Whop dashboard
 */

export interface WhopConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  apiBaseUrl: string;
  webhookSecret?: string;
}

export interface WhopUser {
  id: string;
  email: string;
  username?: string;
  profilePicUrl?: string;
  createdAt: string;
}

export interface WhopMembership {
  id: string;
  userId: string;
  productId: string;
  planId: string;
  status: 'active' | 'canceled' | 'expired' | 'past_due';
  validUntil: string;
  createdAt: string;
  canceledAt?: string;
}

export interface WhopAccessCheck {
  valid: boolean;
  membership?: WhopMembership;
  user?: WhopUser;
}

/**
 * Default Whop configuration
 * Set environment variables for production
 */
export const WHOP_CONFIG: WhopConfig = {
  clientId: '', // Set via VITE_WHOP_CLIENT_ID
  redirectUri: typeof window !== 'undefined' 
    ? `${window.location.origin}/auth/whop/callback`
    : 'http://localhost:5173/auth/whop/callback',
  apiBaseUrl: 'https://api.whop.com/api/v5',
};

/**
 * Whop OAuth URLs
 */
export const WHOP_OAUTH_URLS = {
  authorize: 'https://whop.com/oauth',
  token: 'https://api.whop.com/api/v5/oauth/token',
  userInfo: 'https://api.whop.com/api/v5/me',
  memberships: 'https://api.whop.com/api/v5/me/memberships',
};

/**
 * Whop Webhook Event Types
 */
export type WhopWebhookEvent = 
  | 'membership.went_valid'
  | 'membership.went_invalid'
  | 'membership.canceled'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.refunded';

export interface WhopWebhookPayload {
  event: WhopWebhookEvent;
  data: {
    id: string;
    user_id: string;
    product_id: string;
    plan_id?: string;
    status?: string;
    valid_until?: string;
    canceled_at?: string;
    amount?: number;
    currency?: string;
  };
  timestamp: string;
  signature: string;
}

/**
 * Generate Whop OAuth authorization URL
 */
export function getWhopAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: WHOP_CONFIG.clientId,
    redirect_uri: WHOP_CONFIG.redirectUri,
    response_type: 'code',
    scope: 'read_user read_memberships',
  });
  
  if (state) {
    params.append('state', state);
  }
  
  return `${WHOP_OAUTH_URLS.authorize}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 * Note: This should be done server-side in production
 */
export async function exchangeWhopCode(code: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}> {
  const response = await fetch(WHOP_OAUTH_URLS.token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: WHOP_CONFIG.clientId,
      client_secret: WHOP_CONFIG.clientSecret,
      code,
      redirect_uri: WHOP_CONFIG.redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to exchange Whop authorization code');
  }
  
  return response.json();
}

/**
 * Get current user from Whop
 */
export async function getWhopUser(accessToken: string): Promise<WhopUser> {
  const response = await fetch(WHOP_OAUTH_URLS.userInfo, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get Whop user info');
  }
  
  const data = await response.json();
  return {
    id: data.id,
    email: data.email,
    username: data.username,
    profilePicUrl: data.profile_pic_url,
    createdAt: data.created_at,
  };
}

/**
 * Get user memberships from Whop
 */
export async function getWhopMemberships(accessToken: string): Promise<WhopMembership[]> {
  const response = await fetch(WHOP_OAUTH_URLS.memberships, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get Whop memberships');
  }
  
  const data = await response.json();
  return (data.data || []).map((m: Record<string, unknown>) => ({
    id: m.id,
    userId: m.user_id,
    productId: m.product_id,
    planId: m.plan_id,
    status: m.status,
    validUntil: m.valid_until,
    createdAt: m.created_at,
    canceledAt: m.canceled_at,
  }));
}

/**
 * Check if user has valid access to Legal Oracle
 */
export async function checkWhopAccess(accessToken: string): Promise<WhopAccessCheck> {
  try {
    const [user, memberships] = await Promise.all([
      getWhopUser(accessToken),
      getWhopMemberships(accessToken),
    ]);
    
    // Find active Legal Oracle membership
    const activeMembership = memberships.find(
      (m) => m.status === 'active' && new Date(m.validUntil) > new Date()
    );
    
    return {
      valid: !!activeMembership,
      membership: activeMembership,
      user,
    };
  } catch (error) {
    console.error('Whop access check failed:', error);
    return { valid: false };
  }
}

/**
 * Store Whop tokens in localStorage
 */
export function storeWhopTokens(tokens: {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}): void {
  const expiresAt = Date.now() + tokens.expires_in * 1000;
  localStorage.setItem('whop_access_token', tokens.access_token);
  localStorage.setItem('whop_token_expires', expiresAt.toString());
  if (tokens.refresh_token) {
    localStorage.setItem('whop_refresh_token', tokens.refresh_token);
  }
}

/**
 * Get stored Whop access token
 */
export function getStoredWhopToken(): string | null {
  const token = localStorage.getItem('whop_access_token');
  const expires = localStorage.getItem('whop_token_expires');
  
  if (!token || !expires) return null;
  if (Date.now() > parseInt(expires, 10)) {
    clearWhopTokens();
    return null;
  }
  
  return token;
}

/**
 * Clear Whop tokens from localStorage
 */
export function clearWhopTokens(): void {
  localStorage.removeItem('whop_access_token');
  localStorage.removeItem('whop_refresh_token');
  localStorage.removeItem('whop_token_expires');
}

/**
 * Get Whop checkout URL for a specific plan
 */
export function getWhopCheckoutUrl(planId: string): string {
  return `https://whop.com/checkout/${planId}`;
}

export default WHOP_CONFIG;
