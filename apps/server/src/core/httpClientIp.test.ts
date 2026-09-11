import { describe, expect, it, vi } from 'vitest';
import { clientIp, configureTrustedProxy, handshakeClientIp } from './httpClientIp';

describe('configureTrustedProxy', () => {
  it('trusts a single proxy hop in production', () => {
    const set = vi.fn();
    configureTrustedProxy({ set }, 'production');
    expect(set).toHaveBeenCalledWith('trust proxy', 1);
  });

  it('does not honour forwarded headers outside production', () => {
    const set = vi.fn();
    configureTrustedProxy({ set }, 'test');
    configureTrustedProxy({ set }, 'development');
    expect(set).not.toHaveBeenCalled();
  });
});

describe('clientIp', () => {
  it('prefers Express req.ip over the socket address', () => {
    const ip = clientIp({
      ip: '127.0.0.1',
      socket: { remoteAddress: '10.0.0.1' },
    });
    expect(ip).toBe('127.0.0.1');
  });

  it('strips the IPv4-mapped IPv6 prefix', () => {
    expect(clientIp({ ip: '::ffff:127.0.0.1', socket: { remoteAddress: null } })).toBe('127.0.0.1');
  });
});

describe('handshakeClientIp', () => {
  it('ignores X-Forwarded-For outside production', () => {
    expect(
      handshakeClientIp(
        { address: '10.0.0.8', headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' } },
        'development',
      ),
    ).toBe('10.0.0.8');
  });

  it('uses the first forwarded hop in production', () => {
    expect(
      handshakeClientIp(
        { address: '10.0.0.8', headers: { 'x-forwarded-for': '::ffff:203.0.113.9, 10.0.0.1' } },
        'production',
      ),
    ).toBe('203.0.113.9');
  });
});
