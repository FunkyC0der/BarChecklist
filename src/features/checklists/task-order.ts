export function moveTaskIds(
  taskIds: readonly string[],
  index: number,
  direction: 'down' | 'up',
): string[] {
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (
    index < 0 ||
    index >= taskIds.length ||
    swapWith < 0 ||
    swapWith >= taskIds.length
  ) {
    return [...taskIds];
  }

  const next = [...taskIds];
  const current = next[index];
  const other = next[swapWith];
  if (current === undefined || other === undefined) return [...taskIds];

  next[index] = other;
  next[swapWith] = current;
  return next;
}
