import { describe, expect, it } from 'vitest';
import { App } from './app/app';

describe('chat', () => {
  it('placeholder', () => {
    expect(App()).toBeNull();
  });
});
