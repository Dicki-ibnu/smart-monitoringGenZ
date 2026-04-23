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
    const { transactions } = await req.json();

    if (!transactions || !Array.isArray(transactions) || transactions.length < 3) {
      return new Response(
        JSON.stringify({ error: "At least 3 transactions required for anomaly detection" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amounts = transactions.map((t: { amount: number }) => Number(t.amount));
    const mean = amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / amounts.length
    );

    const anomalies: {
      transaction_id: string;
      z_score: number;
      severity: string;
      alert_type: string;
      message: string;
    }[] = [];

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      const zScore = stdDev > 0 ? (amount - mean) / stdDev : 0;

      if (Math.abs(zScore) > 2) {
        const severity = Math.abs(zScore) > 3 ? "high" : Math.abs(zScore) > 2.5 ? "medium" : "low";
        const alertType = amount > mean ? "unusual_amount" : "unusual_pattern";
        const message =
          amount > mean
            ? `Transaction "${tx.description}" of $${amount.toFixed(2)} is ${Math.abs(zScore).toFixed(1)}x above average`
            : `Unusual spending pattern detected for "${tx.description}"`;

        anomalies.push({
          transaction_id: tx.id,
          z_score: Math.abs(zScore),
          severity,
          alert_type: alertType,
          message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        anomalies,
        stats: { mean, stdDev, total: transactions.length, anomalyCount: anomalies.length },
        model: "z-score-detection",
        note: "TensorFlow.js model placeholder ready for production inference",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
