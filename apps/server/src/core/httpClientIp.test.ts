import { describe, expect, it, vi } from 'vitest';
import { clientIp, configureTrustedProxy } from './httpClientIp';

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
