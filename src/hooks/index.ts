/**
 * Custom React Hooks
 */

export { 
  useNetworkStatus, 
  isNetworkError, 
  getNetworkErrorMessage,
  type NetworkStatus 
} from './useNetworkStatus';

export { useSpeech, type UseSpeechResult } from './useSpeech';

export { 
  usePWA, 
  initPWA, 
  setWaitingServiceWorker,
  type UsePWAResult 
} from './usePWA';
