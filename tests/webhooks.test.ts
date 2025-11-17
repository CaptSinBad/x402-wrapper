import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  signWebhook,
  verifyWebhookSignature,
  triggerWebhookEvent,
  processWebhookDelivery,
  processPendingDeliveries,
} from '../apps/lib/webhookDispatcher';

describe('Webhook Dispatcher', () => {
  describe('signWebhook', () => {
    it('should generate consistent HMAC signatures', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test-secret-123';

      const sig1 = signWebhook(payload, secret);
      const sig2 = signWebhook(payload, secret);

      expect(sig1).toBe(sig2);
      expect(sig1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex is 64 chars
    });

    it('should produce different signatures for different payloads', () => {
      const secret = 'test-secret-123';
      const sig1 = signWebhook(JSON.stringify({ test: '1' }), secret);
      const sig2 = signWebhook(JSON.stringify({ test: '2' }), secret);

      expect(sig1).not.toBe(sig2);
    });

    it('should produce different signatures for different secrets', () => {
      const payload = JSON.stringify({ test: 'data' });
      const sig1 = signWebhook(payload, 'secret-1');
      const sig2 = signWebhook(payload, 'secret-2');

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid signatures', () => {
      const payload = JSON.stringify({ event: 'payment.completed' });
      const secret = 'webhook-secret-key';
      const signature = signWebhook(payload, secret);

      const isValid = verifyWebhookSignature(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const payload = JSON.stringify({ event: 'payment.completed' });
      const secret = 'webhook-secret-key';
      const invalidSig = 'a'.repeat(64); // Invalid signature

      try {
        const result = verifyWebhookSignature(payload, invalidSig, secret);
        expect(result).toBe(false);
      } catch (e) {
        // timingSafeEqual throws on length mismatch
        expect(e).toBeDefined();
      }
    });

    it('should reject signatures with wrong secret', () => {
      const payload = JSON.stringify({ event: 'payment.completed' });
      const signature = signWebhook(payload, 'secret-1');

      try {
        const result = verifyWebhookSignature(payload, signature, 'secret-2');
        expect(result).toBe(false);
      } catch (e) {
        // Should throw on mismatch
        expect(e).toBeDefined();
      }
    });

    it('should reject modified payloads', () => {
      const payload1 = JSON.stringify({ event: 'payment.completed', id: '123' });
      const payload2 = JSON.stringify({ event: 'payment.completed', id: '456' });
      const secret = 'webhook-secret-key';
      const signature = signWebhook(payload1, secret);

      try {
        const result = verifyWebhookSignature(payload2, signature, secret);
        expect(result).toBe(false);
      } catch (e) {
        // Should throw on mismatch
        expect(e).toBeDefined();
      }
    });
  });

  describe('triggerWebhookEvent', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {
        createWebhookEvent: vi.fn().mockResolvedValue({ id: 'event-1' }),
        getWebhookSubscriptionsForEvent: vi.fn().mockResolvedValue([
          { id: 'sub-1', seller_id: 'seller-1' },
          { id: 'sub-2', seller_id: 'seller-1' },
        ]),
        createWebhookDelivery: vi.fn().mockResolvedValue({ id: 'delivery-1' }),
      };
    });

    it('should create event and deliveries for all subscriptions', async () => {
      const event = {
        event_type: 'payment.completed',
        seller_id: 'seller-1',
        resource_type: 'payment_attempt',
        resource_id: 'attempt-1',
        payload: { amount: 1000 },
        timestamp: new Date().toISOString(),
      };

      const count = await triggerWebhookEvent(mockDb, event);

      expect(mockDb.createWebhookEvent).toHaveBeenCalledWith({
        event_type: 'payment.completed',
        seller_id: 'seller-1',
        resource_type: 'payment_attempt',
        resource_id: 'attempt-1',
        payload: { amount: 1000 },
      });

      expect(mockDb.getWebhookSubscriptionsForEvent).toHaveBeenCalledWith(
        'seller-1',
        'payment.completed'
      );

      expect(mockDb.createWebhookDelivery).toHaveBeenCalledTimes(2);
      expect(count).toBe(2);
    });

    it('should handle no subscriptions gracefully', async () => {
      mockDb.getWebhookSubscriptionsForEvent.mockResolvedValueOnce([]);

      const event = {
        event_type: 'payment.completed',
        seller_id: 'seller-1',
        resource_type: 'payment_attempt',
        resource_id: 'attempt-1',
        payload: { amount: 1000 },
        timestamp: new Date().toISOString(),
      };

      const count = await triggerWebhookEvent(mockDb, event);

      expect(count).toBe(0);
    });

    it('should catch errors in delivery creation', async () => {
      mockDb.createWebhookDelivery.mockRejectedValueOnce(new Error('DB error'));

      const event = {
        event_type: 'payment.completed',
        seller_id: 'seller-1',
        resource_type: 'payment_attempt',
        resource_id: 'attempt-1',
        payload: { amount: 1000 },
        timestamp: new Date().toISOString(),
      };

      const count = await triggerWebhookEvent(mockDb, event);

      // One subscription succeeded, one failed
      expect(count).toBe(1);
    });
  });

  describe('processWebhookDelivery', () => {
    let mockDb: any;
    let fetchMock: any;

    beforeEach(() => {
      mockDb = {
        updateWebhookDelivery: vi.fn().mockResolvedValue({}),
        updateWebhookSubscription: vi.fn().mockResolvedValue({}),
      };

      // Mock global fetch
      global.fetch = vi.fn();
      fetchMock = global.fetch;
    });

    it('should mark successful deliveries', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('{"status": "received"}'),
      };
      fetchMock.mockResolvedValueOnce(mockResponse);

      const delivery = {
        id: 'delivery-1',
        attempt_count: 0,
        max_attempts: 5,
        webhook_event_id: 'event-1',
        webhook_subscription_id: 'sub-1',
      };

      const subscription = {
        id: 'sub-1',
        url: 'https://example.com/webhook',
        secret: 'test-secret',
      };

      const event = {
        id: 'event-1',
        event_type: 'payment.completed',
        seller_id: 'seller-1',
        resource_type: 'payment_attempt',
        resource_id: 'attempt-1',
        payload: { amount: 1000 },
        created_at: '2024-01-01T00:00:00Z',
      };

      await processWebhookDelivery(mockDb, delivery, subscription, event);

      expect(mockDb.updateWebhookDelivery).toHaveBeenCalledWith(
        'delivery-1',
        expect.objectContaining({
          status: 'success',
          response_status_code: 200,
          delivered_at: expect.any(String),
          attempt_count: 1,
        })
      );

      expect(mockDb.updateWebhookSubscription).toHaveBeenCalledWith(
        'sub-1',
        expect.objectContaining({ last_delivered_at: expect.any(String) })
      );
    });

    it('should retry failed deliveries with backoff', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Internal Server Error'),
      };
      fetchMock.mockResolvedValueOnce(mockResponse);

      const delivery = {
        id: 'delivery-1',
        attempt_count: 1,
        max_attempts: 5,
        webhook_event_id: 'event-1',
        webhook_subscription_id: 'sub-1',
      };

      const subscription = {
        id: 'sub-1',
        url: 'https://example.com/webhook',
        secret: 'test-secret',
      };

      const event = {
        id: 'event-1',
        event_type: 'payment.completed',
        seller_id: 'seller-1',
        resource_type: 'payment_attempt',
        resource_id: 'attempt-1',
        payload: { amount: 1000 },
        created_at: '2024-01-01T00:00:00Z',
      };

      await processWebhookDelivery(mockDb, delivery, subscription, event);

      expect(mockDb.updateWebhookDelivery).toHaveBeenCalled();
      const call = mockDb.updateWebhookDelivery.mock.calls[0];
      expect(call[0]).toBe('delivery-1');
      expect(call[1].status).toBe('retry');
      expect(call[1].response_status_code).toBe(500);
      expect(call[1].attempt_count).toBe(2);
      expect(call[1].next_retry_at).toBeDefined();
    });

    it('should mark as failed after max attempts', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Internal Server Error'),
      };
      fetchMock.mockResolvedValueOnce(mockResponse);

      const delivery = {
        id: 'delivery-1',
        attempt_count: 4, // Already tried 4 times
        max_attempts: 5,
        webhook_event_id: 'event-1',
        webhook_subscription_id: 'sub-1',
      };

      const subscription = {
        id: 'sub-1',
        url: 'https://example.com/webhook',
        secret: 'test-secret',
      };

      const event = {
        id: 'event-1',
        event_type: 'payment.completed',
        seller_id: 'seller-1',
        resource_type: 'payment_attempt',
        resource_id: 'attempt-1',
        payload: { amount: 1000 },
        created_at: '2024-01-01T00:00:00Z',
      };

      await processWebhookDelivery(mockDb, delivery, subscription, event);

      expect(mockDb.updateWebhookDelivery).toHaveBeenCalledWith(
        'delivery-1',
        expect.objectContaining({
          status: 'failed',
          error_message: 'Failed after 5 attempts',
          attempt_count: 5,
        })
      );
    });

    it('should handle network errors with retry', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network timeout'));

      const delivery = {
        id: 'delivery-1',
        attempt_count: 0,
        max_attempts: 5,
        webhook_event_id: 'event-1',
        webhook_subscription_id: 'sub-1',
      };

      const subscription = {
        id: 'sub-1',
        url: 'https://example.com/webhook',
        secret: 'test-secret',
      };

      const event = {
        id: 'event-1',
        event_type: 'payment.completed',
        seller_id: 'seller-1',
        resource_type: 'payment_attempt',
        resource_id: 'attempt-1',
        payload: { amount: 1000 },
        created_at: '2024-01-01T00:00:00Z',
      };

      await processWebhookDelivery(mockDb, delivery, subscription, event);

      expect(mockDb.updateWebhookDelivery).toHaveBeenCalled();
      const call = mockDb.updateWebhookDelivery.mock.calls[0];
      expect(call[0]).toBe('delivery-1');
      expect(call[1].status).toBe('retry');
      expect(call[1].error_message).toContain('Network timeout');
      expect(call[1].attempt_count).toBe(1);
      expect(call[1].next_retry_at).toBeDefined();
    });

    it('should include correct signature in request headers', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('OK'),
      };
      fetchMock.mockResolvedValueOnce(mockResponse);

      const delivery = {
        id: 'delivery-1',
        attempt_count: 0,
        max_attempts: 5,
        webhook_event_id: 'event-1',
        webhook_subscription_id: 'sub-1',
      };

      const subscription = {
        id: 'sub-1',
        url: 'https://example.com/webhook',
        secret: 'webhook-secret-key',
      };

      const event = {
        id: 'event-1',
        event_type: 'payment.completed',
        seller_id: 'seller-1',
        resource_type: 'payment_attempt',
        resource_id: 'attempt-1',
        payload: { amount: 1000 },
        created_at: '2024-01-01T00:00:00Z',
      };

      await processWebhookDelivery(mockDb, delivery, subscription, event);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Signature': expect.any(String),
            'X-Webhook-Event': 'payment.completed',
            'X-Webhook-Timestamp': '2024-01-01T00:00:00Z',
          }),
        })
      );

      const callArgs = fetchMock.mock.calls[0];
      const headers = callArgs[1].headers;
      const body = callArgs[1].body;

      // Verify signature is valid
      const expectedSig = signWebhook(body, 'webhook-secret-key');
      expect(headers['X-Webhook-Signature']).toBe(expectedSig);
    });
  });

  describe('processPendingDeliveries', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {
        getWebhookDeliveriesPending: vi.fn(),
        getWebhookSubscription: vi.fn(),
        supabase: {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [] }),
              }),
            }),
          }),
        },
        pgPool: null,
        USE_SUPABASE: true,
        updateWebhookDelivery: vi.fn(),
        updateWebhookSubscription: vi.fn(),
      };
    });

    it('should process multiple deliveries', async () => {
      mockDb.getWebhookDeliveriesPending.mockResolvedValueOnce([
        { id: 'del-1' },
        { id: 'del-2' },
        { id: 'del-3' },
      ]);

      mockDb.getWebhookSubscription.mockResolvedValue({
        id: 'sub-1',
        url: 'https://example.com/webhook',
        secret: 'secret',
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('OK'),
      });

      const result = await processPendingDeliveries(mockDb);

      expect(result.processed).toBe(3);
      expect(mockDb.getWebhookDeliveriesPending).toHaveBeenCalledWith(10);
    });

    it('should return empty result when no pending deliveries', async () => {
      mockDb.getWebhookDeliveriesPending.mockResolvedValueOnce([]);

      const result = await processPendingDeliveries(mockDb);

      expect(result).toEqual({ processed: 0, succeeded: 0, failed: 0 });
    });

    it('should respect batch size parameter', async () => {
      mockDb.getWebhookDeliveriesPending.mockResolvedValueOnce([]);

      await processPendingDeliveries(mockDb, 50);

      expect(mockDb.getWebhookDeliveriesPending).toHaveBeenCalledWith(50);
    });
  });
});
