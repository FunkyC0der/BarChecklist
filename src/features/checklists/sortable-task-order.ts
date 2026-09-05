import { arrayMove } from '@dnd-kit/helpers';

export function applyReorder(
  ids: readonly string[],
  from: number,
  to: number,
): string[] {
  return arrayMove([...ids], from, to);
}
