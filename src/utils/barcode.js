const SUPPORTED_LENGTHS = new Set([8, 12, 13, 14]);

export function isValidBarcode(value) {
  const code = String(value ?? '').trim();

  if (!/^\d+$/.test(code) || !SUPPORTED_LENGTHS.has(code.length)) {
    return false;
  }

  const digits = code.slice(0, -1).split('').reverse().map(Number);
  const sum = digits.reduce((total, digit, index) => {
    return total + digit * (index % 2 === 0 ? 3 : 1);
  }, 0);

  const expectedCheckDigit = (10 - (sum % 10)) % 10;
  return expectedCheckDigit === Number(code.at(-1));
}

export function normalizeBarcode(value) {
  return String(value ?? '').trim();
}
