// This utility fetches the discount matrix CSV and seeds the database
// Run this once to populate the discount_thresholds table

export async function seedDiscountMatrix(): Promise<{ success: boolean; message: string; rowsInserted?: number }> {
  try {
    // Fetch the CSV from public folder
    const response = await fetch('/documents/discount-matrix.csv');
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }
    
    const csvContent = await response.text();
    
    // Call the edge function with the CSV content
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    const seedResponse = await fetch(`${supabaseUrl}/functions/v1/seed-discount-matrix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ csvContent }),
    });
    
    const result = await seedResponse.json();
    
    if (!seedResponse.ok) {
      throw new Error(result.error || 'Failed to seed discount matrix');
    }
    
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error seeding discount matrix:', error);
    return { success: false, message };
  }
}
