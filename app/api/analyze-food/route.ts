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

    const url = `https://api.edamam.com/api/nutrition-data?app_id=${appId}&app_key=${appKey}&ingr=${encodeURIComponent(ingredient)}`;
    
    const response = await fetch(url);
    const data = await response.json();

    // --- ULTRA-RESILIENT CALORIE PARSING ---
    let rawCalories = null;

    // 1. Try standard totalNutrients object path
    if (data.totalNutrients?.ENERC_KCAL?.quantity !== undefined) {
      rawCalories = data.totalNutrients.ENERC_KCAL.quantity;
    } 
    // 2. Try totalNutrientsKCal object path (Edamam uses this in some configurations)
    else if (data.totalNutrientsKCal?.ENERC_KCAL?.quantity !== undefined) {
      rawCalories = data.totalNutrientsKCal.ENERC_KCAL.quantity;
    } 
    // 3. Fall back to the top-level global calories summary field
    else if (data.calories !== undefined && data.calories !== null) {
      rawCalories = data.calories;
    }

    console.log("Parsed calorie result determined by server:", rawCalories);

    // If the item genuinely has 0 calories (like water), allow it! 
    // Only fail if it's completely missing or null.
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