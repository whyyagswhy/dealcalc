import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

interface ExtractionResult {
  line_items: ExtractedLineItem[];
  confidence: string;
  notes: string;
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
  // Default to image/png for raw base64
  return { mimeType: 'image/png', isSupported: true };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    // Prepare the file URL (handle both data URL and raw base64)
    const fileUrl = file_base64.startsWith('data:') 
      ? file_base64 
      : `data:${mimeType};base64,${file_base64}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
- product_name: The name of the product/service
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
                          description: 'Name of the product or service' 
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

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to process image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_contract_line_items') {
      console.error('Unexpected AI response format:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to extract data from image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractedData: ExtractionResult = JSON.parse(toolCall.function.arguments);
    console.log(`Extracted ${extractedData.line_items.length} line items with ${extractedData.confidence} confidence`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData 
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
