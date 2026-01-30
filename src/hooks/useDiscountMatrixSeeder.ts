import { useEffect, useState } from 'react';
import { seedDiscountMatrix } from '@/lib/seedDiscountMatrix';
import { supabase } from '@/integrations/supabase/client';

// This hook checks if the discount matrix needs seeding and seeds it if necessary
// It runs once on app initialization
export function useDiscountMatrixSeeder() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'seeding' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    async function checkAndSeed() {
      setStatus('checking');
      
      try {
        // Check if data already exists using a raw count query
        const { count, error: countError } = await (supabase as any)
          .from('discount_thresholds')
          .select('*', { count: 'exact', head: true });

        if (countError) {
          // Table might not exist yet or other error
          console.log('Discount thresholds table check failed:', countError.message);
          setStatus('error');
          setMessage(`Table check failed: ${countError.message}`);
          return;
        }

        if (count && count > 0) {
          console.log(`Discount thresholds already seeded with ${count} rows`);
          setStatus('done');
          setMessage(`Already seeded with ${count} rows`);
          return;
        }

        // Need to seed the data
        setStatus('seeding');
        console.log('Seeding discount thresholds...');
        
        const result = await seedDiscountMatrix();
        
        if (result.success) {
          setStatus('done');
          setMessage(result.message);
          console.log('Discount matrix seeding complete:', result.message);
        } else {
          setStatus('error');
          setMessage(result.message);
          console.error('Discount matrix seeding failed:', result.message);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setStatus('error');
        setMessage(errorMsg);
        console.error('Error in discount matrix seeder:', error);
      }
    }

    checkAndSeed();
  }, []);

  return { status, message };
}
