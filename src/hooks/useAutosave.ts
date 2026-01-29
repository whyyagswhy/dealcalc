import { useState, useEffect, useRef, useCallback } from 'react';

export type SaveStatus = 'saved' | 'saving' | 'error' | 'idle';

interface UseAutosaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

export function useAutosave<T>({ 
  data, 
  onSave, 
  delay = 400, 
  enabled = true 
}: UseAutosaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>(JSON.stringify(data));
  const pendingDataRef = useRef<T>(data);

  const save = useCallback(async (dataToSave: T) => {
    const serialized = JSON.stringify(dataToSave);
    if (serialized === lastSavedRef.current) return;

    setStatus('saving');
    setError(null);

    try {
      await onSave(dataToSave);
      lastSavedRef.current = serialized;
      setStatus('saved');
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Save failed'));
      setStatus('error');
    }
  }, [onSave]);

  const retry = useCallback(() => {
    save(pendingDataRef.current);
  }, [save]);

  useEffect(() => {
    if (!enabled) return;

    pendingDataRef.current = data;
    const serialized = JSON.stringify(data);
    
    if (serialized === lastSavedRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      save(data);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, save]);

  // Update lastSavedRef when initial data loads
  useEffect(() => {
    lastSavedRef.current = JSON.stringify(data);
  }, []);

  return { status, error, retry };
}
