import { NextResponse } from 'next/server';
import { getOpenAIdailySpend } from '@/lib/openai-spend';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace') || 'business';

    let last7DaysSpend = 0;
    
    try {
      const openAiData = await getOpenAIdailySpend(7);
      if (openAiData && openAiData.length > 0) {
        last7DaysSpend = openAiData.reduce((sum, b) => sum + b.spend, 0);
      }
    } catch(e) {}

    // Algorithm based on straight-line run rate
    const projected_weekly = last7DaysSpend; 
    const projected_monthly = (last7DaysSpend / 7) * 30;
    const trend_direction = last7DaysSpend > 0 ? 'up' : 'flat';

    return NextResponse.json({
      projected_weekly,
      projected_monthly,
      trend_direction
    });
  } catch (error) {
    console.error('Spend Forecast Error:', error);
    return NextResponse.json({ error: 'Failed to fetch spend forecast' }, { status: 500 });
  }
}
