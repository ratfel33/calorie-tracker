import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Extract the food string from the frontend request
    const { foodQuery } = await request.json();

    if (!foodQuery) {
      return NextResponse.json({ error: 'Food item description is required.' }, { status: 400 });
    }

    // 2. Fetch secrets securely from Vercel's private environment variables
    const appId = process.env.EDAMAM_APP_ID;
    const appKey = process.env.EDAMAM_APP_KEY;

    if (!appId || !appKey) {
      console.error("Missing Edamam API Credentials in Environment Settings");
      return NextResponse.json({ error: 'Internal Server Configuration Error.' }, { status: 500 });
    }

    // 3. Make the secure server-to-server request to Edamam
    // We use line-by-line components instead of raw string symbols for syntax safety
    const targetUrl = new URL('https://api.edamam.com/api/nutrition-details');
    targetUrl.searchParams.append('app_id', appId);
    targetUrl.searchParams.append('app_key', appKey);

    const edamamResponse = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ingr: [foodQuery] // Edamam expects an array of strings
      }),
    });

    if (!edamamResponse.ok) {
      const errorText = await edamamResponse.text();
      return NextResponse.json({ error: 'Failed parsing details from Edamam', details: errorText }, { status: edamamResponse.status });
    }

    const data = await edamamResponse.json();

    // 4. Return only the needed total calories back to your UI
    return NextResponse.json({
      food: foodQuery,
      calories: data.calories || 0,
      totalWeight: data.totalWeight || 0
    });

  } catch (error: any) {
    return NextResponse.json({ error: 'Server Error', message: error.message }, { status: 500 });
  }
}