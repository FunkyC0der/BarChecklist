import {
  Link as TanStackLink,
  Navigate as TanStackNavigate,
  Outlet,
} from '@tanstack/react-router';
import type { ComponentPropsWithoutRef, ComponentType } from 'react';

export { Outlet };

type LinkProps = ComponentPropsWithoutRef<'a'> & { to: string };

/** Retains the string `to` API while delegating every link interaction to TanStack. */
export const Link = TanStackLink as unknown as ComponentType<LinkProps>;

export const NavLink = Link;

export const Navigate = TanStackNavigate as unknown as ComponentType<{
  replace?: boolean;
  to: string;
}>;
