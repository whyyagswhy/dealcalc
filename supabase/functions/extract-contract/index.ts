import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ExtractedLineItem {
  product_name: string;
  list_unit_price: number;
  quantity: number;
  term_months: number;
  discount_percent: number | null;
  net_unit_price: number | null;
}

interface MatchedLineItem extends ExtractedLineItem {
  original_product_name: string;
  matched_product_name: string | null;
  matched_list_price: number | null;
  match_confidence: 'high' | 'medium' | 'low' | 'none';
}

interface ExtractionResult {
  line_items: MatchedLineItem[];
  confidence: string;
  notes: string;
}

interface PriceBookProduct {
  product_name: string;
  category: string;
  edition: string | null;
  monthly_list_price: number | null;
  annual_list_price: number;
}

// Detect file type from data URL or base64
function detectFileType(dataUrl: string): { mimeType: string; isSupported: boolean } {
  if (dataUrl.startsWith('data:')) {
    const match = dataUrl.match(/^data:([^;,]+)/);
    if (match) {
      const mimeType = match[1];
      const isSupported = mimeType.startsWith('image/') || mimeType === 'application/pdf';
      return { mimeType, isSupported };
    }
  }
  return { mimeType: 'image/png', isSupported: true };
}

// Format product name for discount matrix: "[Edition] Category"
function formatProductName(category: string, edition: string | null): string {
  if (edition) {
    return `[${edition}] ${category}`;
  }
  return category;
}

// Get monthly price from product
function getMonthlyPrice(product: PriceBookProduct): number {
  if (product.monthly_list_price !== null) {
    return product.monthly_list_price;
  }
  return product.annual_list_price / 12;
}

// Match products to price book using AI
async function matchProductsToBook(
  lineItems: ExtractedLineItem[],
  priceBookProducts: PriceBookProduct[],
  apiKey: string
): Promise<MatchedLineItem[]> {
  if (lineItems.length === 0) {
    return [];
  }

  // Build a summary of available products for the AI
  const uniqueProducts = new Map<string, PriceBookProduct>();
  for (const p of priceBookProducts) {
    const key = formatProductName(p.category, p.edition);
    if (!uniqueProducts.has(key)) {
      uniqueProducts.set(key, p);
    }
  }

  const productList = Array.from(uniqueProducts.entries())
    .map(([name, p]) => `- ${name} ($${getMonthlyPrice(p).toFixed(2)}/mo)`)
    .join('\n');

  const extractedList = lineItems
    .map((item, idx) => `${idx + 1}. "${item.product_name}"`)
    .join('\n');

  console.log(`Matching ${lineItems.length} products to ${uniqueProducts.size} price book entries`);

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are matching product names from a sales contract to a Salesforce price book.
Your task is to find the best match from the price book for each extracted product name.

The price book uses this naming format: [Edition] Category
For example: "[Enterprise] Sales Cloud", "[Unlimited] Service Cloud", "[Professional] Einstein Analytics"

Common variations you might see in contracts:
- "Sales Cloud Enterprise" → "[Enterprise] Sales Cloud"
- "Salesforce Service - Unlimited" → "[Unlimited] Service Cloud"
- "SF Sales Enterprise Edition" → "[Enterprise] Sales Cloud"
- "Platform Plus - Developer" → "[Developer] Platform Plus"

Match based on semantic meaning, not exact string matching.
If no good match exists (e.g., custom or third-party products), return null for the match.`
        },
        {
          role: 'user',
          content: `Price Book Products:\n${productList}\n\nExtracted Products to Match:\n${extractedList}\n\nFor each extracted product, find the best match from the price book.`
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'match_products',
            description: 'Match extracted product names to price book entries',
            parameters: {
              type: 'object',
              properties: {
                matches: {
                  type: 'array',
                  description: 'Array of matches for each extracted product (in same order)',
                  items: {
                    type: 'object',
                    properties: {
                      matched_name: {
                        type: 'string',
                        nullable: true,
                        description: 'The matched product name from price book in [Edition] Category format, or null if no match'
                      },
                      confidence: {
                        type: 'string',
                        enum: ['high', 'medium', 'low', 'none'],
                        description: 'Confidence level: high (exact match), medium (likely match), low (possible match), none (no match)'
                      }
                    },
                    required: ['matched_name', 'confidence']
                  }
                }
              },
              required: ['matches']
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'match_products' } }
    }),
  });

  if (!response.ok) {
    console.error('AI matching failed:', response.status);
    // Return items without matching on failure
    return lineItems.map(item => ({
      ...item,
      original_product_name: item.product_name,
      matched_product_name: null,
      matched_list_price: null,
      match_confidence: 'none' as const,
    }));
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall || toolCall.function.name !== 'match_products') {
    console.error('Unexpected AI response format for matching');
    return lineItems.map(item => ({
      ...item,
      original_product_name: item.product_name,
      matched_product_name: null,
      matched_list_price: null,
      match_confidence: 'none' as const,
    }));
  }

  const matchResults = JSON.parse(toolCall.function.arguments);
  console.log('Match results:', JSON.stringify(matchResults));

  // Combine line items with their matches
  return lineItems.map((item, idx) => {
    const match = matchResults.matches[idx];
    const matchedName = match?.matched_name || null;
    const confidence = match?.confidence || 'none';
    
    // Find the matched product in the price book to get its price
    let matchedPrice: number | null = null;
    if (matchedName) {
      const product = uniqueProducts.get(matchedName);
      if (product) {
        matchedPrice = getMonthlyPrice(product);
      }
    }

    return {
      ...item,
      original_product_name: item.product_name,
      matched_product_name: matchedName,
      matched_list_price: matchedPrice,
      match_confidence: confidence as 'high' | 'medium' | 'low' | 'none',
      // If matched, use the matched name as product_name for the final result
      product_name: matchedName || item.product_name,
      // If matched and confidence is high/medium, use price book price
      list_unit_price: (matchedPrice !== null && (confidence === 'high' || confidence === 'medium')) 
        ? matchedPrice 
        : item.list_unit_price,
    };
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate user via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token);

    if (authError || !claimsData?.claims) {
      console.error('JWT verification failed:', authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log(`Authenticated user: ${userId}`);

    const { file_base64 } = await req.json();

    if (!file_base64) {
      return new Response(
        JSON.stringify({ success: false, error: 'File data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detect file type
    const { mimeType, isSupported } = detectFileType(file_base64);
    
    if (!isSupported) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unsupported file type. Please upload an image or PDF.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isPdf = mimeType === 'application/pdf';
    console.log(`Processing contract ${isPdf ? 'PDF' : 'image'} for extraction...`);

    // Fetch price book products for matching
    console.log('Fetching price book products...');
    const { data: priceBookProducts, error: pbError } = await supabaseClient
      .from('price_book_products')
      .select('product_name, category, edition, monthly_list_price, annual_list_price');
    
    if (pbError) {
      console.error('Failed to fetch price book:', pbError.message);
    }
    console.log(`Fetched ${priceBookProducts?.length || 0} price book products`);

    // Prepare the file URL
    const fileUrl = file_base64.startsWith('data:') 
      ? file_base64 
      : `data:${mimeType};base64,${file_base64}`;

    // Step 1: Extract line items from image
    const extractResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting structured data from contract and pricing documents. 
Your task is to extract line items from contract screenshots with high accuracy.

For each line item found, extract:
- product_name: The name of the product/service exactly as shown
- list_unit_price: The list/retail price per unit (monthly if possible, otherwise convert annual to monthly by dividing by 12)
- quantity: The number of units/seats/licenses
- term_months: Contract term in months (e.g., 12 for 1 year, 36 for 3 years)
- discount_percent: The discount percentage if shown (null if not shown)
- net_unit_price: The net/discounted price per unit (null if not shown)

Important:
- All prices should be MONTHLY unit prices (per seat/license/unit per month)
- If only annual prices are shown, divide by 12 to get monthly
- If only total prices are shown, divide by quantity to get unit price
- Be precise with numbers - extract exactly what's shown
- If a field is not visible or cannot be determined, use null`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all line items from this contract/pricing document. Return the data in the structured format.'
              },
              {
                type: 'image_url',
                image_url: { url: fileUrl }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_contract_line_items',
              description: 'Extract structured line item data from a contract document',
              parameters: {
                type: 'object',
                properties: {
                  line_items: {
                    type: 'array',
                    description: 'Array of extracted line items',
                    items: {
                      type: 'object',
                      properties: {
                        product_name: { 
                          type: 'string', 
                          description: 'Name of the product or service exactly as shown' 
                        },
                        list_unit_price: { 
                          type: 'number', 
                          description: 'List/retail price per unit per month' 
                        },
                        quantity: { 
                          type: 'integer', 
                          description: 'Number of units/seats/licenses' 
                        },
                        term_months: { 
                          type: 'integer', 
                          description: 'Contract term in months' 
                        },
                        discount_percent: { 
                          type: 'number', 
                          nullable: true,
                          description: 'Discount percentage (null if not shown)' 
                        },
                        net_unit_price: { 
                          type: 'number', 
                          nullable: true,
                          description: 'Net/discounted price per unit per month (null if not shown)' 
                        }
                      },
                      required: ['product_name', 'list_unit_price', 'quantity', 'term_months']
                    }
                  },
                  confidence: {
                    type: 'string',
                    enum: ['high', 'medium', 'low'],
                    description: 'Confidence level in the extraction accuracy'
                  },
                  notes: {
                    type: 'string',
                    description: 'Any notes about the extraction, assumptions made, or issues encountered'
                  }
                },
                required: ['line_items', 'confidence', 'notes']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_contract_line_items' } }
      }),
    });

    if (!extractResponse.ok) {
      if (extractResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (extractResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await extractResponse.text();
      console.error('AI gateway error:', extractResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to process image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractData = await extractResponse.json();
    console.log('AI extraction response received');

    const toolCall = extractData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_contract_line_items') {
      console.error('Unexpected AI response format:', JSON.stringify(extractData));
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to extract data from image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log(`Extracted ${extractedData.line_items.length} line items with ${extractedData.confidence} confidence`);

    // Step 2: Match products to price book
    let matchedLineItems: MatchedLineItem[];
    if (priceBookProducts && priceBookProducts.length > 0 && extractedData.line_items.length > 0) {
      console.log('Starting product matching...');
      matchedLineItems = await matchProductsToBook(
        extractedData.line_items,
        priceBookProducts as PriceBookProduct[],
        LOVABLE_API_KEY
      );
      const matchedCount = matchedLineItems.filter(i => i.match_confidence !== 'none').length;
      console.log(`Matched ${matchedCount}/${matchedLineItems.length} products to price book`);
    } else {
      // No price book or no items to match
      matchedLineItems = extractedData.line_items.map((item: ExtractedLineItem) => ({
        ...item,
        original_product_name: item.product_name,
        matched_product_name: null,
        matched_list_price: null,
        match_confidence: 'none' as const,
      }));
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          line_items: matchedLineItems,
          confidence: extractedData.confidence,
          notes: extractedData.notes,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing contract:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
