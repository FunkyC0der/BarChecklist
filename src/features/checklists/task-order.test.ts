import { describe, expect, it } from 'vitest';

import { moveTaskIds } from './task-order';

const ids = ['a', 'b', 'c'];

describe('moveTaskIds', () => {
  it('moves a task up and down', () => {
    expect(moveTaskIds(ids, 1, 'up')).toEqual(['b', 'a', 'c']);
    expect(moveTaskIds(ids, 1, 'down')).toEqual(['a', 'c', 'b']);
  });

  it('keeps the list unchanged at the edges', () => {
    expect(moveTaskIds(ids, 0, 'up')).toEqual(ids);
    expect(moveTaskIds(ids, 2, 'down')).toEqual(ids);
    expect(moveTaskIds(ids, -1, 'up')).toEqual(ids);
    expect(moveTaskIds(ids, 9, 'down')).toEqual(ids);
  });
});
