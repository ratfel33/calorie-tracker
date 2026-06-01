import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // Assuming you are using Supabase

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Or your standard auth key setup
);

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

export async function DELETE(request: NextRequest) { // Using NextRequest for easy URL parsing
  try {
    // Extract the id directly from the URL query string
    const { searchParams } = new URL(request.url);
    const mealId = searchParams.get('id');

    if (!mealId) {
      return NextResponse.json({ error: 'No meal ID provided in URL parameters' }, { status: 400 });
    }

    // Execute deletion query directly against your 'meals' table
    const { error, count } = await supabase
      .from('meals') 
      .delete() 
      .eq('id', mealId)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (count === 0) {
      return NextResponse.json({ 
        error: `Could not find a meal entry with ID: ${mealId}` 
      }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Catch inside DELETE route:", error);
    return NextResponse.json({ error: 'Internal server processing error' }, { status: 500 });
  }
}