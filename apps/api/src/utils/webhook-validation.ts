import crypto from 'crypto';
import { Request } from 'express';
import rateLimit from 'express-rate-limit';

// Interfaces
export interface WebhookValidationResult {
  isValid: boolean;
  error?: string;
  organizationId?: string;
}

export interface WebhookSignature {
  signature: string;
  timestamp?: string;
  algorithm?: string;
}

// Rate limiter para webhooks
export const webhookRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por IP
  message: 'Too many webhook requests',
  standardHeaders: true,
  legacyHeaders: false,
});

// Extração de assinaturas por provedor
export function extractSignature(req: Request, provider: string): WebhookSignature | null {
  const headers = req.headers;
  
  switch (provider) {
    case 'meta':
    case 'whatsapp':
      const metaSignature = headers['x-hub-signature-256'] as string;
      if (!metaSignature) return null;
      return {
        signature: metaSignature.replace('sha256=', ''),
        algorithm: 'sha256'
      };
      
    case 'stripe':
      const stripeSignature = headers['stripe-signature'] as string;
      if (!stripeSignature) return null;
      
      const elements = stripeSignature.split(',');
      let timestamp = '';
      let signature = '';
      
      elements.forEach(element => {
        const [key, value] = element.split('=');
        if (key === 't') timestamp = value;
        if (key === 'v1') signature = value;
      });
      
      return { signature, timestamp, algorithm: 'sha256' };
      
    case 'paypal':
      const paypalSignature = headers['paypal-transmission-sig'] as string;
      const paypalId = headers['paypal-transmission-id'] as string;
      const paypalTimestamp = headers['paypal-transmission-time'] as string;
      
      if (!paypalSignature || !paypalId || !paypalTimestamp) return null;
      
      return {
        signature: paypalSignature,
        timestamp: paypalTimestamp,
        algorithm: 'sha256'
      };
      
    case 'google':
      // Google usa JWT no header Authorization
      const authHeader = headers['authorization'] as string;
      if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
      
      return {
        signature: authHeader.replace('Bearer ', ''),
        algorithm: 'jwt'
      };
      
    default:
      return null;
  }
}

// Validação HMAC para Meta Ads e WhatsApp
export function validateMetaWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Meta webhook validation error:', error);
    return false;
  }
}

// Validação HMAC para Stripe
export function validateStripeWebhook(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  try {
    // Verificar se o timestamp não é muito antigo (5 minutos)
    const currentTime = Math.floor(Date.now() / 1000);
    const webhookTime = parseInt(timestamp);
    
    if (currentTime - webhookTime > 300) {
      console.error('Stripe webhook timestamp too old');
      return false;
    }
    
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Stripe webhook validation error:', error);
    return false;
  }
}

// Validação para PayPal
export function validatePayPalWebhook(
  payload: string,
  signature: string,
  transmissionId: string,
  timestamp: string,
  webhookId: string,
  certId: string
): boolean {
  try {
    // PayPal usa validação baseada em certificado
    // Aqui seria necessário implementar a validação completa do certificado
    // Por simplicidade, vamos fazer uma validação básica
    
    const expectedPayload = `${transmissionId}|${timestamp}|${webhookId}|${crypto.createHash('sha256').update(payload).digest('base64')}`;
    
    // Em produção, você deve usar o certificado público do PayPal
    // para verificar a assinatura RSA-SHA256
    
    return signature.length > 0 && transmissionId.length > 0;
  } catch (error) {
    console.error('PayPal webhook validation error:', error);
    return false;
  }
}

// Validação JWT para Google Ads (Pub/Sub)
export function validateGoogleWebhook(
  token: string,
  expectedAudience: string
): boolean {
  try {
    // Em produção, você deve usar a biblioteca google-auth-library
    // para verificar o JWT token do Google
    
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    // Verificações básicas
    if (payload.aud !== expectedAudience) return false;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    
    return true;
  } catch (error) {
    console.error('Google webhook validation error:', error);
    return false;
  }
}

// Verificação de desafio para Meta e WhatsApp
export function verifyChallenge(
  mode: string,
  token: string,
  challenge: string,
  verifyToken: string
): string | null {
  if (mode === 'subscribe' && token === verifyToken) {
    return challenge;
  }
  return null;
}

// Função principal de validação
export async function validateWebhook(
  req: Request,
  provider: string,
  organizationId: string
): Promise<WebhookValidationResult> {
  try {
    const signature = extractSignature(req, provider);
    if (!signature) {
      return {
        isValid: false,
        error: 'Missing or invalid signature header'
      };
    }
    
    const payload = JSON.stringify(req.body);
    
    // Aqui você buscaria as credenciais da organização no banco
    // const orgCredentials = await getOrganizationCredentials(organizationId, provider);
    
    let isValid = false;
    
    switch (provider) {
      case 'meta':
      case 'whatsapp':
        // const metaSecret = orgCredentials.metaAppSecret;
        const metaSecret = process.env.META_APP_SECRET || 'default-secret';
        isValid = validateMetaWebhook(payload, signature.signature, metaSecret);
        break;
        
      case 'stripe':
        if (!signature.timestamp) {
          return { isValid: false, error: 'Missing timestamp' };
        }
        // const stripeSecret = orgCredentials.stripeWebhookSecret;
        const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET || 'default-secret';
        isValid = validateStripeWebhook(payload, signature.signature, signature.timestamp, stripeSecret);
        break;
        
      case 'paypal':
        // Implementação simplificada
        isValid = signature.signature.length > 0;
        break;
        
      case 'google':
        const expectedAudience = process.env.GOOGLE_PUBSUB_AUDIENCE || 'default-audience';
        isValid = validateGoogleWebhook(signature.signature, expectedAudience);
        break;
        
      default:
        return {
          isValid: false,
          error: `Unsupported provider: ${provider}`
        };
    }
    
    return {
      isValid,
      organizationId: isValid ? organizationId : undefined,
      error: isValid ? undefined : 'Invalid signature'
    };
    
  } catch (error) {
    console.error('Webhook validation error:', error);
    return {
      isValid: false,
      error: 'Validation failed'
    };
  }
}

// Configurações por provedor
export const WEBHOOK_CONFIG = {
  meta: {
    signatureHeader: 'x-hub-signature-256',
    algorithm: 'sha256',
    encoding: 'hex'
  },
  whatsapp: {
    signatureHeader: 'x-hub-signature-256',
    algorithm: 'sha256',
    encoding: 'hex'
  },
  stripe: {
    signatureHeader: 'stripe-signature',
    algorithm: 'sha256',
    encoding: 'hex',
    timestampTolerance: 300 // 5 minutos
  },
  paypal: {
    signatureHeader: 'paypal-transmission-sig',
    algorithm: 'rsa-sha256',
    encoding: 'base64'
  },
  google: {
    signatureHeader: 'authorization',
    algorithm: 'jwt',
    encoding: 'base64'
  }
};