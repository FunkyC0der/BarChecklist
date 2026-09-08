import { RouterProvider } from '@tanstack/react-router';

import { createAppRouter } from './app-router';

const router = createAppRouter();

export function App() {
  return <RouterProvider router={router} />;
}
