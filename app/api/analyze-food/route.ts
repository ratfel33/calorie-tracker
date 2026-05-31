import { NextResponse } from 'next/server';

// Deep-seeking function to find calories anywhere in a nested JSON structure
function findCaloriesDeep(obj: any): number | null {
  if (!obj || typeof obj !== 'object') return null;

  // 1. If we see ENERC_KCAL, immediately look for its quantity number
  if (obj.ENERC_KCAL && typeof obj.ENERC_KCAL === 'object') {
    if (typeof obj.ENERC_KCAL.quantity === 'number') {
      return obj.ENERC_KCAL.quantity;
    }
  }

  // 2. If we see a flat 'calories' key that holds a valid number, grab it
  if (typeof obj.calories === 'number') {
    return obj.calories;
  }

  // 3. Drill down deeper into arrays or child objects
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const result = findCaloriesDeep(obj[key]);
      if (result !== null) return result; // Return as soon as we strike gold
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ingredient = body.foodQuery;

    if (!ingredient || !ingredient.trim()) {
      return NextResponse.json({ error: 'No food input text provided' }, { status: 400 });
    }

    const appId = process.env.NEXT_EDAMAM_APP_ID;
    const appKey = process.env.NEXT_EDAMAM_APP_KEY;

    const url = `https://api.edamam.com/api/nutrition-data?app_id=${appId}&app_key=${appKey}&ingr=${encodeURIComponent(ingredient)}`;
    
    const response = await fetch(url);
    const data = await response.json();

    // Run our deep recursive search across the entire nested payload
    const rawCalories = findCaloriesDeep(data);

    console.log("Deep search extracted calorie value:", rawCalories);

    if (rawCalories === null || rawCalories === undefined) {
      return NextResponse.json(
        { 
          error: 'Could not parse calorie data for this specific item.',
          debugRawKeys: Object.keys(data) // Sends keys to client console for verification
        }, 
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