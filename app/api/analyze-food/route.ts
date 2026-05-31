import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ingredient = body.foodQuery;

    console.log("Backend received text:", ingredient);

    if (!ingredient || !ingredient.trim()) {
      return NextResponse.json({ error: 'No food input text provided' }, { status: 400 });
    }

    const appId = process.env.NEXT_EDAMAM_APP_ID;
    const appKey = process.env.NEXT_EDAMAM_APP_KEY;

    // DIAGNOSTIC LOG: Let's see if the server actually reads the keys
    console.log("Server Key Check - ID Exists:", !!appId, "Key Exists:", !!appKey);

    const url = `https://api.edamam.com/api/nutrition-data?app_id=${appId}&app_key=${appKey}&ingr=${encodeURIComponent(ingredient)}`;
    
    const response = await fetch(url);
    const data = await response.json();

    // DIAGNOSTIC LOG: Let's print the exact structure Edamam answers with
    console.log("Edamam Raw Data Response Keys:", Object.keys(data));
    if (data.ingredients) {
      console.log("Edamam parsed ingredients detail:", JSON.stringify(data.ingredients));
    }

    const energyData = data.totalNutrients?.ENERC_KCAL;
    const rawCalories = energyData ? energyData.quantity : null;

    if (rawCalories === null || rawCalories === undefined) {
      return NextResponse.json(
        { error: 'Could not parse calorie data for this specific item.' }, 
        { status: 422 }
      );
    }

    return NextResponse.json({ 
      calories: Math.round(rawCalories) 
    });

  } catch (error) {
    console.error("Fatal error in API route:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}