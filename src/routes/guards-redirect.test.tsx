import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({
  session: null as { user: { id: string } } | null,
}));
const redirects = vi.hoisted(() => ({ targets: [] as string[] }));

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({ session: authState.session }),
}));

// `Navigate` is stubbed to *record* the requested target instead of
// performing the navigation. The real `Navigate` re-fires its effect
// whenever `to` changes, so a `to` that differs between renders is a second
// (stomping) navigation. Memory history in the other guard tests cannot
// expose this: it never moves `window.location`, which is the input
// `RequireAuth` reads.
vi.mock('@/lib/router', () => ({
  Navigate: ({ to }: { to: string }) => {
    redirects.targets.push(to);
    return <div data-testid="redirect">{to}</div>;
  },
  Outlet: () => null,
}));

import { RequireAuth } from './guards';

// A fresh element on every call: re-rendering the *same* element object
// makes React bail out of the subtree, which would hide the very re-render
// this suite is about.
const protectedTree = () => (
  <RequireAuth>
    <div>protected</div>
  </RequireAuth>
);
const deepLink = '/checklists/checklist-1';
const deepLinkTarget = `/sign-in?returnTo=${encodeURIComponent(deepLink)}`;

describe('RequireAuth redirect target', () => {
  beforeEach(() => {
    authState.session = null;
    redirects.targets = [];
    window.history.replaceState({}, '', '/');
  });

  it('keeps the returnTo when the URL moves to /sign-in mid-redirect (P1-B)', () => {
    window.history.replaceState({}, '', deepLink);
    const { rerender } = render(protectedTree());

    expect(redirects.targets).toEqual([deepLinkTarget]);

    // TanStack commits the destination URL and notifies subscribers while
    // the match load is still pending, so the still-mounted shell re-renders
    // with `window.location.pathname === '/sign-in'`. Recomputing `to` here
    // would drop the returnTo and stomp the first redirect.
    window.history.replaceState({}, '', '/sign-in');
    rerender(protectedTree());

    expect(new Set(redirects.targets)).toEqual(new Set([deepLinkTarget]));
    expect(screen.getByTestId('redirect')).toHaveTextContent(deepLinkTarget);
  });

  it('asks for exactly one redirect across re-renders of the persistent shell', () => {
    window.history.replaceState({}, '', '/today');
    const { rerender } = render(protectedTree());

    // The shell is a pathless layout route, so this guard stays mounted and
    // re-renders on every router state change while the redirect is in
    // flight. Each distinct `to` is one more navigation.
    window.history.replaceState({}, '', '/sign-in');
    rerender(protectedTree());
    window.history.replaceState({}, '', '/not-a-product-path');
    rerender(protectedTree());

    expect(new Set(redirects.targets).size).toBe(1);
    expect(redirects.targets[0]).toBe(
      `/sign-in?returnTo=${encodeURIComponent('/today')}`,
    );
  });

  it('recomputes the target when the session ends', () => {
    authState.session = { user: { id: 'user-1' } };
    window.history.replaceState({}, '', '/team');
    const { rerender } = render(protectedTree());

    expect(screen.getByText('protected')).toBeInTheDocument();
    expect(redirects.targets).toEqual([]);

    authState.session = null;
    rerender(protectedTree());

    expect(redirects.targets).toEqual([
      `/sign-in?returnTo=${encodeURIComponent('/team')}`,
    ]);
  });

  it('falls back to bare sign-in for a path that is not a product route', () => {
    window.history.replaceState({}, '', '/not-a-product-path');
    render(protectedTree());

    expect(redirects.targets).toEqual(['/sign-in']);
  });
});
