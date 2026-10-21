import { describe, it, expect } from 'vitest';
import { usernameToEmail } from './sign-in';

describe('usernameToEmail', () => {
  it('maps plain username to domain email in lowercase', () => {
    expect(usernameToEmail('admin.ga')).toBe('admin.ga@tps.co.id');
    expect(usernameToEmail('Admin.GA')).toBe('admin.ga@tps.co.id');
    expect(usernameToEmail('  vendor.aisya  ')).toBe('vendor.aisya@tps.co.id');
  });

  it('preserves full email input in lowercase', () => {
    expect(usernameToEmail('admin.ga@tps.co.id')).toBe('admin.ga@tps.co.id');
    expect(usernameToEmail('VENDOR.IBU@TPS.CO.ID')).toBe('vendor.ibu@tps.co.id');
  });

  it('handles empty or whitespace strings', () => {
    expect(usernameToEmail('')).toBe('');
    expect(usernameToEmail('   ')).toBe('');
  });
});
