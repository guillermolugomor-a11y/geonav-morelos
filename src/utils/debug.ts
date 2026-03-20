const enabled = import.meta.env.DEV;

export const debugLog = (...args: unknown[]) => {
  if (enabled) {
    console.log(...args);
  }
};

export const debugWarn = (...args: unknown[]) => {
  if (enabled) {
    console.warn(...args);
  }
};

export const debugError = (...args: unknown[]) => {
  if (enabled) {
    console.error(...args);
  }
};
