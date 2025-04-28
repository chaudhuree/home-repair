/**
 * Generates a unique transaction ID with a prefix and random alphanumeric characters
 * @returns {string} A unique transaction ID
 */
export function generateTransactionId(): string {
  const prefix = 'TRX';
  const timestamp = Date.now().toString().slice(-8);
  const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `${prefix}-${timestamp}-${randomChars}`;
}
