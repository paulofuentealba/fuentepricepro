// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../auth-provider';
import * as sessionCookie from '../sessionCookie';
import * as demoMode from '../demoMode';
import * as firebaseAuth from 'firebase/auth';

vi.mock('firebase/auth', () => ({
  onIdTokenChanged: vi.fn((_auth, callback) => {
    callback(null);
    return vi.fn();
  }),
  signOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/integrations/firebase/client', () => ({
  auth: { currentUser: null },
}));

describe('AuthProvider signOut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls firebase signOut, clears session cookie, ends demo mode, and redirects to landing page', async () => {
    const clearCookieSpy = vi.spyOn(sessionCookie, 'clearSessionCookie');
    const endDemoSpy = vi.spyOn(demoMode, 'endDemoMode');
    const assignMock = vi.fn();
    delete (window as any).location;
    window.location = { assign: assignMock } as any;

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    clearCookieSpy.mockClear();
    endDemoSpy.mockClear();

    await act(async () => {
      await result.current.signOut();
    });

    expect(firebaseAuth.signOut).toHaveBeenCalledTimes(1);
    expect(clearCookieSpy).toHaveBeenCalledTimes(1);
    expect(endDemoSpy).toHaveBeenCalledTimes(1);
    expect(assignMock).toHaveBeenCalledWith('/');
  });
});
