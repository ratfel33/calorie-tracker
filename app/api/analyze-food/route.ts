import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 1. Read the exact JSON body from your dashboard
    const body = await request.json();
    
    // 2. Explicitly grab 'foodQuery' (which maps to your dashboard's payload)
    const ingredient = body.foodQuery;

    // Log this to your Vercel logs so you can see it arrive
    console.log("Backend received text:", ingredient);

    if (!ingredient || !ingredient.trim()) {
      return NextResponse.json({ error: 'No food input text provided' }, { status: 400 });
    }

    const appId = process.env.NEXT_EDAMAM_APP_ID;
    const appKey = process.env.NEXT_EDAMAM_APP_KEY;

    if (!appId || !appKey) {
      return NextResponse.json({ error: 'Missing API credentials on server' }, { status: 500 });
    }

    // 3. The exact GET URL that worked in your direct test
    const url = `https://api.edamam.com/api/nutrition-data?app_id=${appId}&app_key=${appKey}&ingr=${encodeURIComponent(ingredient)}`;
    
    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json({ error: 'Edamam API communication failure' }, { status: response.status });
    }

    const data = await response.json();

    // 4. Dig straight into totalNutrients.ENERC_KCAL like you saw in your test response!
    const energyData = data.totalNutrients?.ENERC_KCAL;
    const rawCalories = energyData ? energyData.quantity : null;

    if (rawCalories === null || rawCalories === undefined) {
      return NextResponse.json(
        { error: 'Could not parse calorie data for this specific item.' }, 
        { status: 422 }
      );
    }

    // 5. Send back just the clean number to the dashboard
    return NextResponse.json({ 
      calories: Math.round(rawCalories) 
    });

  } catch (error) {
    console.error("Fatal error in API route:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}