import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Parse percentage string to decimal (e.g., "17.00%" -> 0.17)
function parsePercentage(value: string): number | null {
  if (!value || value.trim() === '') return null;
  // Remove > prefix if present (for Level 5 values we're ignoring)
  const cleaned = value.replace('>', '').replace('%', '').trim();
  if (cleaned === '') return null;
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  return num / 100;
}

// Parse CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if data already exists
    const { count, error: countError } = await supabase
      .from('discount_thresholds')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to check existing data: ${countError.message}`);
    }

    if (count && count > 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Data already seeded with ${count} rows`,
          rowsInserted: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body to get CSV content
    const body = await req.json().catch(() => ({}));
    const csvContent = body.csvContent;
    
    if (!csvContent) {
      throw new Error("CSV content is required in the request body");
    }

    const lines = csvContent.split('\n').filter((line: string) => line.trim());
    
    // Skip header row
    const dataLines = lines.slice(1);
    
    const records: {
      product_name: string;
      qty_min: number;
      qty_max: number;
      level_0_max: number | null;
      level_1_max: number | null;
      level_2_max: number | null;
      level_3_max: number | null;
      level_4_max: number | null;
    }[] = [];

    for (const line of dataLines) {
      const fields = parseCSVLine(line);
      
      if (fields.length < 8) continue;

      // Remove quotes from product name
      const productName = fields[0].replace(/^"|"$/g, '');
      const qtyMin = parseInt(fields[1], 10) || 1;
      const qtyMax = parseInt(fields[2], 10) || 999999999;

      records.push({
        product_name: productName,
        qty_min: qtyMin,
        qty_max: qtyMax,
        level_0_max: parsePercentage(fields[3]),
        level_1_max: parsePercentage(fields[4]),
        level_2_max: parsePercentage(fields[5]),
        level_3_max: parsePercentage(fields[6]),
        level_4_max: parsePercentage(fields[7]),
      });
    }

    // Insert in batches of 500
    const batchSize = 500;
    let totalInserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('discount_thresholds')
        .insert(batch);

      if (insertError) {
        throw new Error(`Failed to insert batch ${i / batchSize + 1}: ${insertError.message}`);
      }
      
      totalInserted += batch.length;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully seeded ${totalInserted} discount threshold rows`,
        rowsInserted: totalInserted 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error seeding discount matrix:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
