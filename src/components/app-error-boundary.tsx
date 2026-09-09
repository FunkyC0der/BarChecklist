import { Component, type ReactNode } from 'react';

import { logger } from '@/lib/logger';

import { Alert, Button, Screen } from './ui';

type Props = { children: ReactNode };
type State = { crashed: boolean };

/** Catches a render crash anywhere below it — including a provider's own
 * `useX must be used within Provider` throw — and logs it instead of
 * leaving a beta user staring at a blank screen. Must be a class component:
 * React only calls getDerivedStateFromError/componentDidCatch on those. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(error: unknown) {
    logger.error('app.render-crash', error);
  }

  render() {
    if (this.state.crashed) {
      return (
        <Screen scroll={false}>
          <div className="flex w-full max-w-md flex-col gap-4">
            <Alert color="error">
              Щось пішло не так. Спробуйте перезавантажити.
            </Alert>
            <Button
              className="btn-block"
              color="primary"
              onClick={() => window.location.reload()}
            >
              Перезавантажити
            </Button>
          </div>
        </Screen>
      );
    }

    return this.props.children;
  }
}
