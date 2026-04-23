import { describe, it, expect, beforeEach } from 'vitest';
import { findComposer, findSubmitButton, findStopButton, isGenerating } from '../src/content/selectors';

function setBody(html: string) {
  document.body.innerHTML = html;
}

describe('selectors', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('findComposer', () => {
    it('finds composer by id#prompt-textarea', () => {
      setBody('<div id="prompt-textarea" contenteditable="true"></div>');
      expect(findComposer()).not.toBeNull();
    });

    it('falls back to any contenteditable inside a form', () => {
      setBody('<form><div contenteditable="true" class="x"></div></form>');
      const el = findComposer();
      expect(el).not.toBeNull();
      expect(el?.getAttribute('contenteditable')).toBe('true');
    });

    it('returns null when no composer is present', () => {
      setBody('<div>nope</div>');
      expect(findComposer()).toBeNull();
    });
  });

  describe('findSubmitButton / findStopButton', () => {
    it('finds send button via data-testid', () => {
      setBody('<button data-testid="send-button"></button>');
      expect(findSubmitButton()).not.toBeNull();
    });

    it('finds send button via aria-label', () => {
      setBody('<button aria-label="Send prompt"></button>');
      expect(findSubmitButton()).not.toBeNull();
    });

    it('finds stop button via data-testid', () => {
      setBody('<button data-testid="stop-button"></button>');
      expect(findStopButton()).not.toBeNull();
    });

    it('finds stop button via aria-label', () => {
      setBody('<button aria-label="Stop streaming"></button>');
      expect(findStopButton()).not.toBeNull();
    });
  });

  describe('isGenerating', () => {
    it('true when stop button present', () => {
      setBody('<button data-testid="stop-button"></button>');
      expect(isGenerating()).toBe(true);
    });

    it('false when only send button present', () => {
      setBody('<button data-testid="send-button"></button>');
      expect(isGenerating()).toBe(false);
    });
  });
});
