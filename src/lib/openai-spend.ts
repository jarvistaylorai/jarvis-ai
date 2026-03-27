export async function getOpenAIdailySpend(days = 30) {
  const adminKey = process.env.OPENAI_ADMIN_KEY;
  if (!adminKey) {
    console.warn('OPENAI_ADMIN_KEY is not set');
    return null;
  }

  // Calculate timestamps
  const now = new Date();
  const endTime = Math.floor(now.getTime() / 1000);
  const startTime = endTime - (days * 24 * 60 * 60);

  let hasMore = true;
  let nextCursor: string | null = null;
  
  const dailySpend: { date: string, spend: number }[] = [];
  const spendMap: Record<string, number> = {};

  try {
    while (hasMore) {
      // Build URL
      const url = new URL('https://api.openai.com/v1/organization/costs');
      url.searchParams.append('start_time', startTime.toString());
      url.searchParams.append('end_time', endTime.toString());
      url.searchParams.append('limit', '50');
      if (nextCursor) {
        url.searchParams.append('after', nextCursor);
      }

      const res = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${adminKey}` },
        cache: 'no-store'
      });

      if (!res.ok) {
        console.error('OpenAI Costs API returned HTTP', res.status, await res.text());
        return null;
      }

      const data = await res.json();
      
      for (const bucket of data.data || []) {
        const dateStr = bucket.start_time_iso.split('T')[0];
        let bucketTotal = 0;
        for (const result of bucket.results || []) {
           // OpenAI amount object: { value: "1.23", currency: "USD" }
           bucketTotal += parseFloat(result.amount?.value || 0) || 0;
        }
        spendMap[dateStr] = (spendMap[dateStr] || 0) + bucketTotal;
      }

      hasMore = data.has_more;
      nextCursor = data.next_page || null;
      
      if (!hasMore || !nextCursor) break;
    }

    // Convert map to array sorted by date
    for (const [date, spend] of Object.entries(spendMap)) {
      dailySpend.push({ date, spend });
    }
    
    dailySpend.sort((a, b) => a.date.localeCompare(b.date));

    return dailySpend;

  } catch (err) {
    console.error('Failed to fetch OpenAI daily spend:', err);
    return null;
  }
}

export async function getOpenAIUsageByModel(days = 7) {
  const adminKey = process.env.OPENAI_ADMIN_KEY;
  if (!adminKey) return null;

  const now = new Date();
  const endTime = Math.floor(now.getTime() / 1000);
  const startTime = endTime - (days * 24 * 60 * 60);

    const hasMore = true;
    const nextCursor: string | null = null;
    const pageCount = 0;
  
  const modelStats: Record<string, unknown> = {};

  try {
    const url = new URL('https://api.openai.com/v1/organization/usage/completions');
    url.searchParams.append('start_time', startTime.toString());
    url.searchParams.append('end_time', endTime.toString());
    url.searchParams.append('group_by', 'model');

    const res = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${adminKey}` },
      cache: 'no-store'
    });

    if (!res.ok) return null;

    const data = await res.json();
    
    for (const bucket of data.data || []) {
      for (const result of bucket.results || []) {
         const model = result.model || 'unknown';
         if (!modelStats[model]) {
            modelStats[model] = { id: model, name: model, provider: 'OpenAI', tokens: 0, sessions: 0, spend: 0 };
         }
         modelStats[model].tokens += (result.input_tokens || 0) + (result.output_tokens || 0);
         modelStats[model].sessions += (result.num_model_requests || 0);
      }
    }

    return Object.values(modelStats);
    } catch(e) { return null; }
}
