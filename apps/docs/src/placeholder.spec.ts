import { describe, expect, it } from 'vitest';
import { App } from './app/app';

describe('docs', () => {
  it('placeholder', () => {
    expect(App()).toBeNull();
  });
});
