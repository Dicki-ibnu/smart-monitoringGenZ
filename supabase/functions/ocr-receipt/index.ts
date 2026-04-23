import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { image_url, raw_text } = await req.json();

    // Simulated OCR processing
    // In production, this would use TensorFlow.js for image-to-text inference
    const parsed = parseReceiptText(raw_text || "");

    return new Response(
      JSON.stringify({
        ocr_status: "processed",
        merchant_name: parsed.merchant,
        total_amount: parsed.total,
        transaction_date: parsed.date,
        items: parsed.items,
        raw_text: raw_text,
        model: "tesseract-simulated",
        note: "TensorFlow.js OCR model placeholder ready for production inference",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message, ocr_status: "failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseReceiptText(text: string): { merchant: string; total: number; date: string; items: string[] } {
  const lines = text.split("\n").filter((l) => l.trim());
  const merchant = lines[0] || "Unknown Merchant";

  const totalMatch = text.match(/(?:total|amount|sum|due)[:\s]*\$?([\d,.]+)/i);
  const total = totalMatch ? parseFloat(totalMatch[1].replace(",", "")) : 0;

  const dateMatch = text.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/);
  const date = dateMatch ? dateMatch[1] : new Date().toISOString().split("T")[0];

  const itemLines = lines.slice(1, -2).filter((l) => !l.match(/^(total|subtotal|tax|date)/i));

  return { merchant, total, date, items: itemLines };
}
