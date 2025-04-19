/**
 * Helper function to retry a function with exponential backoff
 * @param fn Function to retry
 * @param retries Number of retries
 * @param delay Initial delay in ms
 */
async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 300): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      // Check if it's a transient error that can be retried
      if (
        retries > 0 && 
        (error?.code === 'P2010' || 
         error?.message?.includes('TransientTransactionError') ||
         error?.message?.includes('forcibly closed'))
      ) {
        // Wait for the delay
        await new Promise(resolve => setTimeout(resolve, delay));
        // Retry with exponential backoff
        return retry(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  export default retry;