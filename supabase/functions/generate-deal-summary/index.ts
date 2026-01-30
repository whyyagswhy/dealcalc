import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LineItem {
  id: string;
  scenario_id: string;
  product_name: string;
  list_unit_price: number;
  quantity: number;
  term_months: number;
  discount_percent: number | null;
  net_unit_price: number | null;
  revenue_type: string;
}

interface Scenario {
  id: string;
  deal_id: string;
  name: string;
  position: number;
}

interface Deal {
  id: string;
  name: string;
  display_mode: string;
  view_mode: string;
}

interface ScenarioSummary {
  name: string;
  products: Array<{
    name: string;
    quantity: number;
    listMonthly: number;
    netMonthly: number;
    discountPercent: number;
    termMonths: number;
  }>;
  totals: {
    listAnnual: number;
    netAnnual: number;
    listTerm: number;
    netTerm: number;
    blendedDiscount: number;
    annualSavings: number;
    termSavings: number;
  };
}

function calculateNetUnitPrice(listPrice: number, discountPercent: number | null, netPrice: number | null): number {
  if (netPrice !== null) return netPrice;
  if (discountPercent !== null) return listPrice * (1 - discountPercent);
  return listPrice;
}

function calculateScenarioSummary(scenario: Scenario, lineItems: LineItem[]): ScenarioSummary {
  const products = lineItems.map((item) => {
    const netUnitPrice = calculateNetUnitPrice(
      item.list_unit_price,
      item.discount_percent,
      item.net_unit_price
    );
    const discountPercent = item.list_unit_price > 0
      ? (item.list_unit_price - netUnitPrice) / item.list_unit_price
      : 0;

    return {
      name: item.product_name,
      quantity: item.quantity,
      listMonthly: item.list_unit_price * item.quantity,
      netMonthly: netUnitPrice * item.quantity,
      discountPercent,
      termMonths: item.term_months,
    };
  });

  // Calculate totals
  let listMonthly = 0;
  let netMonthly = 0;
  let listTerm = 0;
  let netTerm = 0;

  for (const p of products) {
    listMonthly += p.listMonthly;
    netMonthly += p.netMonthly;
    listTerm += p.listMonthly * p.termMonths;
    netTerm += p.netMonthly * p.termMonths;
  }

  const listAnnual = listMonthly * 12;
  const netAnnual = netMonthly * 12;
  const blendedDiscount = listTerm > 0 ? (listTerm - netTerm) / listTerm : 0;
  const annualSavings = listAnnual - netAnnual;
  const termSavings = listTerm - netTerm;

  return {
    name: scenario.name,
    products,
    totals: {
      listAnnual,
      netAnnual,
      listTerm,
      netTerm,
      blendedDiscount,
      annualSavings,
      termSavings,
    },
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function buildAIPrompt(deal: Deal, scenarios: ScenarioSummary[], userPrompt?: string): string {
  // Build structured deal context
  let context = `Deal Name: ${deal.name}\n\n`;

  for (const scenario of scenarios) {
    context += `## ${scenario.name}\n`;
    context += `Products:\n`;
    for (const product of scenario.products) {
      context += `- ${product.name}: ${product.quantity} units at ${formatCurrency(product.netMonthly)}/month`;
      if (product.discountPercent > 0) {
        context += ` (${formatPercent(product.discountPercent)} discount)`;
      }
      context += `\n`;
    }
    context += `\nPricing Summary:\n`;
    context += `- List Price (Annual): ${formatCurrency(scenario.totals.listAnnual)}\n`;
    context += `- Net Price (Annual): ${formatCurrency(scenario.totals.netAnnual)}\n`;
    context += `- Annual Savings: ${formatCurrency(scenario.totals.annualSavings)}\n`;
    context += `- Total Term Value: ${formatCurrency(scenario.totals.netTerm)}\n`;
    context += `- Total Term Savings: ${formatCurrency(scenario.totals.termSavings)}\n`;
    context += `- Blended Discount: ${formatPercent(scenario.totals.blendedDiscount)}\n\n`;
  }

  const systemPrompt = `You are creating a deal summary for a sales account executive to share with their customer. Write in clear, professional language that emphasizes value and savings. Format with markdown headers and bullet points for easy reading.

Your output should be customer-ready and suitable for copying directly into an email or proposal.

Generate a summary that includes these sections:
1. **Investment Overview** - Clear statement of the customer's investment (annual and/or term total)
2. **Your Savings** - Quantified discount percentage and dollar savings (make this compelling)
3. **What's Included** - Clean list of products and quantities
4. **Salesforce's Incentives and Concessions** - 2-3 sentences on why this deal represents good value (multi-year commitment benefits, bundling value, partnership investment, etc.)

Guidelines:
- Be concise and scannable
- Lead with value, not cost
- Use the exact numbers from the context
- Make savings prominent and exciting
- Keep it positive and partnership-focused
- Do NOT include generic boilerplate or filler content`;

  let userInstruction = "";
  if (userPrompt && userPrompt.trim()) {
    userInstruction = `\n\nAdditional context from the sales rep: ${userPrompt.trim()}`;
  }

  return JSON.stringify({
    systemPrompt,
    context,
    userInstruction,
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment variables not configured");
    }

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token for RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify the JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { deal_id, prompt } = await req.json();
    
    if (!deal_id) {
      return new Response(
        JSON.stringify({ success: false, error: "deal_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch deal (verify ownership via user_id)
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("*")
      .eq("id", deal_id)
      .eq("user_id", user.id)
      .single();

    if (dealError || !deal) {
      console.error("Deal fetch error:", dealError);
      return new Response(
        JSON.stringify({ success: false, error: "Deal not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch scenarios
    const { data: scenarios, error: scenariosError } = await supabase
      .from("scenarios")
      .select("*")
      .eq("deal_id", deal_id)
      .order("position", { ascending: true });

    if (scenariosError) {
      console.error("Scenarios fetch error:", scenariosError);
      throw new Error("Failed to fetch scenarios");
    }

    if (!scenarios || scenarios.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No scenarios found for this deal" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all line items for all scenarios
    const scenarioIds = scenarios.map((s: Scenario) => s.id);
    const { data: lineItems, error: lineItemsError } = await supabase
      .from("line_items")
      .select("*")
      .in("scenario_id", scenarioIds)
      .order("position", { ascending: true });

    if (lineItemsError) {
      console.error("Line items fetch error:", lineItemsError);
      throw new Error("Failed to fetch line items");
    }

    // Build scenario summaries
    const scenarioSummaries: ScenarioSummary[] = scenarios.map((scenario: Scenario) => {
      const scenarioLineItems = (lineItems || []).filter(
        (li: LineItem) => li.scenario_id === scenario.id
      );
      return calculateScenarioSummary(scenario, scenarioLineItems);
    });

    // Filter out empty scenarios
    const nonEmptyScenarios = scenarioSummaries.filter((s) => s.products.length > 0);

    if (nonEmptyScenarios.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No line items found in any scenario" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the AI prompt
    const promptData = JSON.parse(buildAIPrompt(deal as Deal, nonEmptyScenarios, prompt));

    console.log("Calling Lovable AI for deal summary generation...");

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: promptData.systemPrompt },
          { role: "user", content: promptData.context + promptData.userInstruction },
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("Failed to generate summary");
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content;

    if (!summary) {
      throw new Error("No summary generated");
    }

    console.log("Summary generated successfully");

    return new Response(
      JSON.stringify({ success: true, summary }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate deal summary error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
