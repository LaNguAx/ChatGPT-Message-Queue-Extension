type Level = 'debug' | 'info' | 'warn' | 'error';

let verbose = false;
export const setVerbose = (v: boolean) => {
  verbose = v;
};

const PREFIX = '[chatgpt-queue]';

export const log = {
  debug: (...a: unknown[]) => {
    if (verbose) console.debug(PREFIX, ...a);
  },
  info: (...a: unknown[]) => console.info(PREFIX, ...a),
  warn: (...a: unknown[]) => console.warn(PREFIX, ...a),
  error: (...a: unknown[]) => console.error(PREFIX, ...a),
} satisfies Record<Level, (...a: unknown[]) => void>;
