import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { ingredient } = await request.json();
    
    // Update these to match the exact names you just saved in Vercel!
    const appId = process.env.NEXT_EDAMAM_APP_ID;
    const appKey = process.env.NEXT_EDAMAM_APP_KEY;

if (!appId || !appKey) {
  console.error("DEBUG: appId is", appId, "appKey is", appKey); // Add this line to see what's happening
  return NextResponse.json({ error: 'Missing API credentials on server' }, { status: 500 });
}

    const response = await fetch(
      `https://api.edamam.com/api/nutrition-data?app_id=${appId}&app_key=${appKey}&ingr=${encodeURIComponent(ingredient)}`
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ unexpected error in analyze-food route:", error);
    return NextResponse.json({ error: 'Failed to fetch nutrition data' }, { status: 500 });
  }
}