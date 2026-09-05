import { useEffect, useRef } from 'react';

import { watchLogicalDate } from '@/lib/dates';

export function useLogicalDateRefresh({
  timeZone,
  logicalDate,
  onRefresh,
}: {
  timeZone: string | null;
  logicalDate: string | null;
  onRefresh: () => void;
}): void {
  const callbackRef = useRef(onRefresh);
  useEffect(() => {
    callbackRef.current = onRefresh;
  }, [onRefresh]);
  useEffect(() => {
    if (!timeZone || !logicalDate) return;
    return watchLogicalDate(timeZone, (next) => {
      if (next !== logicalDate) callbackRef.current();
    });
  }, [timeZone, logicalDate]);
}
