import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import OpenAI from 'openai';

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

const AVAILABLE_DIETARY_RESTRICTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Non-Vegetarian', 'Dairy-Free',
  'Keto', 'Low-Carb', 'Low-Fat', 'High-Protein', 'Paleo', 'Mediterranean'
];

const AVAILABLE_MEDICAL_CONTRAINDICATIONS = [
  'Diabetes', 'High Blood Pressure', 'Heart Disease', 'Kidney Disease',
  'Liver Disease', 'High Cholesterol', 'Thyroid Disorders', 'Gout',
  'Acid Reflux/GERD', 'IBS (Irritable Bowel Syndrome)', 'Celiac Disease',
  'Lactose Intolerance', 'Gallbladder Disease', 'Osteoporosis', 'Anemia',
  'Food Allergies', 'Pregnancy', 'Breastfeeding'
];

const VALID_UNITS = [
  'grams', 'kg', 'ounces', 'pounds', 'ml', 'liters', 'cups',
  'tablespoons', 'teaspoons', 'pieces', 'slices', 'cloves', 'bunches'
];

const PORTION_SIZES = [
  '1 TSP ( 5 gm/ml )',
  '1.5 TSP ( 7.5 gm/ml )',
  '1/2 TSP ( 2.5 gm/ml )',
  '2 TSP ( 10 gm/ml )',
  '2.5 TSP ( 15 gm/ml )',
  '1 TBSP ( 15 gm/ml )',
  '1.5 TBSP ( 22.5 gm/ml )',
  '2 TBSP ( 30 gm/ml )',
  '1/2 SMALL BOWL ( 100 gm/ml )',
  '1 SMALL BOWL ( 200 gm/ml )',
  '1.5 SMALL BOWL ( 300 gm/ml )',
  '2.5 SMALL BOWL ( 500 gm/ml )',
  '1 LARGE BOWL ( 300 gm/ml )',
  '1.5 LARGE BOWL ( 150 gm/ml )',
  '2 LARGE BOWL ( 600 gm/ml )',
  '1/2 GLASS ( 125 ml )',
  '1 GLASS ( 250 ml )',
  '1 LARGE GLASS ( 300 ml )',
  '1/2 CUP ( 75 ml )',
  '1 CUP ( 150 ml )',
  '1 SMALL KATORI ( 100 gm/ml )',
  '1 MEDIUM KATORI ( 180 gm/ml )',
  '1 LARGE KATORI ( 250 gm/ml )',
  '1 PLATE ( 100 gm )',
  '1 MEDIUM PLATE ( 160 gm )',
  '1 LARGE PLATE ( 220 gm )',
  'GRAM',
  'ML',
  'EGG WHOLE ( 50 GM WHOLE )',
  'EGG WHITE ( 33 GM )',
  '1 DATES ( 10 GM )',
  'FIG (ANJEER) ( 15 gm )',
  'SEASONAL FRUIT ( 100 gm )',
  'SEASONAL FRUIT ( 200 gm )',
  'ROTI ( 35 GM )',
  'FULLKA ( 25 GM )',
  'STUFFED ROTI ( 50 GM )',
  'PARATHA ( 45 GM )',
  'STUFFED PARATHA ( 80 GM )',
  'BREAD (SMALL) ( 25 GM )',
  'BREAD (MEDIUM) ( 35 GM )',
  'BREAD (LARGE) ( 45 GM )'
];

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipeName } = await request.json();

    if (!recipeName || typeof recipeName !== 'string' || recipeName.trim().length < 2) {
      return NextResponse.json(
        { error: 'Please provide a valid recipe name (at least 2 characters)' },
        { status: 400 }
      );
    }

    const prompt = `You are a professional Indian nutritionist and chef. Given a recipe name, provide detailed nutritional and ingredient information. While the focus is Indian cuisine, handle any cuisine type accurately.

Recipe Name: "${recipeName.trim()}"

Respond with ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "description": "A brief 1-2 sentence description of the dish",
  "prepTime": <number in minutes>,
  "cookTime": <number in minutes>,
  "portionSize": "<exactly one of the portion sizes listed below>",
  "ingredients": [
    {
      "name": "<ingredient name>",
      "quantity": <number>,
      "unit": "<one of: ${VALID_UNITS.join(', ')}>",
      "remarks": "<optional prep instructions like 'chopped', 'soaked overnight', etc.>"
    }
  ],
  "nutrition": {
    "calories": <total calories per standard serving, integer>,
    "protein": <grams of protein, number with up to 1 decimal>,
    "carbs": <grams of carbohydrates, number with up to 1 decimal>,
    "fat": <grams of fat, number with up to 1 decimal>
  },
  "dietaryRestrictions": [<array of applicable tags from: ${AVAILABLE_DIETARY_RESTRICTIONS.join(', ')}>],
  "medicalContraindications": [<array of conditions this should NOT be recommended for, from: ${AVAILABLE_MEDICAL_CONTRAINDICATIONS.join(', ')}>],
  "instructions": [<array of step-by-step cooking instructions as strings>]
}

Available portion sizes (pick the MOST appropriate one for this recipe):
${PORTION_SIZES.map(p => `"${p}"`).join(', ')}

Portion size selection rules:
- For curries, dals, gravies: use SMALL BOWL or LARGE BOWL or KATORI
- For rotis/chapatis: use ROTI or FULLKA or PARATHA
- For rice dishes/biryanis: use PLATE or MEDIUM PLATE
- For drinks/smoothies/lassi: use GLASS
- For chutneys/sauces/small items: use TSP or TBSP
- For eggs: use EGG WHOLE or EGG WHITE
- For fruits: use SEASONAL FRUIT
- For stuffed rotis/parathas: use STUFFED ROTI or STUFFED PARATHA

Important rules:
- Calculate nutrition for a standard single serving based on the portion size you selected
- Use realistic ingredient quantities for a single serving (serving 1-2 people)
- Only use units from the provided list
- Only use dietary restrictions from the provided list
- Only use medical contraindications from the provided list
- For Indian recipes, include common spices and typical ingredients
- Be accurate with nutritional values based on the ingredients and quantities
- Include 4-8 main ingredients typically
- Include 4-8 clear cooking steps
- If the recipe is clearly non-vegetarian (contains meat/fish/eggs), include "Non-Vegetarian". If pure vegetarian, include "Vegetarian". If vegan, include both "Vegan" and "Vegetarian".
- Consider medical conditions carefully: e.g., high-sodium dishes contraindicate High Blood Pressure, high-sugar for Diabetes, high-fat for Heart Disease/High Cholesterol, etc.`;

    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a nutrition expert and professional chef specializing in Indian cuisine. Always respond with valid JSON only. No markdown formatting, no code blocks, just raw JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();

    if (!responseText) {
      return NextResponse.json(
        { error: 'Failed to generate recipe data. Please try again.' },
        { status: 500 }
      );
    }

    // Parse the JSON response, handling potential markdown code blocks
    let recipeData;
    try {
      // Remove markdown code block if present
      let cleanJson = responseText;
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      recipeData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse recipe data. Please try again.' },
        { status: 500 }
      );
    }

    // Validate and sanitize the response
    const sanitized = {
      description: typeof recipeData.description === 'string' ? recipeData.description : '',
      prepTime: Math.max(0, parseInt(recipeData.prepTime) || 0),
      cookTime: Math.max(0, parseInt(recipeData.cookTime) || 0),
      portionSize: PORTION_SIZES.includes(recipeData.portionSize) 
        ? recipeData.portionSize 
        : PORTION_SIZES.find(p => p.includes('SMALL BOWL')) || '1 SMALL BOWL ( 200 gm/ml )',
      ingredients: Array.isArray(recipeData.ingredients)
        ? recipeData.ingredients
            .filter((ing: any) => ing.name && typeof ing.name === 'string')
            .map((ing: any) => ({
              name: ing.name.trim(),
              quantity: Math.max(0, parseFloat(ing.quantity) || 0),
              unit: VALID_UNITS.includes(ing.unit) ? ing.unit : 'grams',
              remarks: typeof ing.remarks === 'string' ? ing.remarks.trim() : '',
            }))
        : [],
      nutrition: {
        calories: Math.max(0, parseInt(recipeData.nutrition?.calories) || 0),
        protein: Math.max(0, parseFloat(recipeData.nutrition?.protein?.toFixed?.(1)) || 0),
        carbs: Math.max(0, parseFloat(recipeData.nutrition?.carbs?.toFixed?.(1)) || 0),
        fat: Math.max(0, parseFloat(recipeData.nutrition?.fat?.toFixed?.(1)) || 0),
      },
      dietaryRestrictions: Array.isArray(recipeData.dietaryRestrictions)
        ? recipeData.dietaryRestrictions.filter((r: string) =>
            AVAILABLE_DIETARY_RESTRICTIONS.includes(r)
          )
        : [],
      medicalContraindications: Array.isArray(recipeData.medicalContraindications)
        ? recipeData.medicalContraindications.filter((c: string) =>
            AVAILABLE_MEDICAL_CONTRAINDICATIONS.includes(c)
          )
        : [],
      instructions: Array.isArray(recipeData.instructions)
        ? recipeData.instructions.filter((i: any) => typeof i === 'string' && i.trim())
        : [],
    };

    return NextResponse.json(sanitized);
  } catch (error: any) {
    console.error('AI recipe generation error:', error);

    if (error?.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'OpenAI API quota exceeded. Please check your billing.' },
        { status: 429 }
      );
    }

    if (error?.code === 'invalid_api_key') {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key configuration.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate recipe data. Please try again.' },
      { status: 500 }
    );
  }
}
