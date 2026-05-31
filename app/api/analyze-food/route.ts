import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 1. Extract the user input from the request body
    const { ingredient } = await request.json();

    // 2. Fetch server environment credentials
    const appId = process.env.NEXT_EDAMAM_APP_ID;
    const appKey = process.env.NEXT_EDAMAM_APP_KEY;

    // Safety net: Verify credentials exist on the Vercel server
    if (!appId || !appKey) {
      console.error("Server Configuration Error: Missing Edamam API credentials.");
      return NextResponse.json(
        { error: 'Missing API credentials on server' }, 
        { status: 500 }
      );
    }

    // 3. Query the Edamam API
    const response = await fetch(
      `https://api.edamam.com/api/nutrition-data?app_id=${appId}&app_key=${appKey}&ingr=${encodeURIComponent(ingredient)}`
    );

    if (!response.ok) {
      console.error(`Edamam API responded with status: ${response.status}`);
      return NextResponse.json(
        { error: 'Failed to communicate with nutrition database API' }, 
        { status: response.status }
      );
    }

    const data = await response.json();

    // DEBUG: Logs the exact JSON structure to your Vercel dashboard logs
    console.log("Raw Edamam Response:", JSON.stringify(data, null, 2));

    // 4. Safely extract the ENERC_KCAL value you verified in your browser
    const energyData = data.totalNutrients?.ENERC_KCAL;
    const rawCalories = energyData ? energyData.quantity : null;

    // Check if Edamam actually returned data for this specific food item
    if (rawCalories === null || rawCalories === undefined) {
      console.warn(`Unrecognized ingredient input: "${ingredient}". No calorie data found.`);
      return NextResponse.json(
        { error: 'Could not calculate calorie data for this specific item. Please check the spelling or quantity.' }, 
        { status: 422 }
      );
    }

    // 5. Package the data beautifully for your frontend dashboard
    // Math.round removes decimals so your database column receives a clean integer
    return NextResponse.json({ 
      calories: Math.round(rawCalories) 
    });

  } catch (error: any) {
    // Catch-all for network timeouts, syntax errors, or server crashes
    console.error("Fatal error in analyze-food route:", error);
    return NextResponse.json(
      { error: 'An unexpected server error occurred while processing nutrition data.' }, 
      { status: 500 }
    );
  }
}