import { Request, Response } from 'express';
import { queryImage, queryText } from '../services/aiClient.js';
import UserModel from '../models/User.js';

/**
 * POST /api/diet/analyze
 * Accepts a meal photo (multipart) and sends it to the AI scraper (ai/server.py)
 * for real nutrition analysis personalized to the user's medical history.
 */
export const analyzeDiet = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await UserModel.findById(req.user!.uid, {
      bloodType: 1, allergies: 1, name: 1
    }).lean();

    const allergiesNote = user?.allergies?.length
      ? `Known allergies: ${user.allergies.join(', ')}.`
      : '';
    const bloodTypeNote = user?.bloodType && user.bloodType !== 'unknown'
      ? `Blood type: ${user.bloodType}.`
      : '';

    let aiResponse: string;

    if (req.file) {
      // Image-based analysis via ai/server.py /img endpoint
      // IMPORTANT: prompt is single-line — keyboard.type() treats \n as Enter (form submit)
      const prompt = `You are a clinical nutritionist AI. Analyze this meal image. Patient profile: ${bloodTypeNote} ${allergiesNote} Reply with ONLY a valid JSON object (no markdown, no tables, no other text) using exactly these keys: {"mealName": "string", "estimatedWeight": "string", "nutrients": {"calories": number, "protein": number, "carbs": number, "fats": number, "fiber": number, "sodium": number, "iron": number, "calcium": number}, "healthScore": number, "assessment": "string", "suggestions": ["string"], "nextMeal": {"name": "string", "reason": "string"}, "alerts": ["string"]}`;


      aiResponse = await queryImage(prompt, req.file.buffer, req.file.mimetype);
    } else if (req.body.mealDescription) {
      // Text-based analysis when no image provided
      const prompt = `You are a clinical nutritionist AI. The patient describes their meal as: "${req.body.mealDescription}".
Patient profile: ${bloodTypeNote} ${allergiesNote}
Provide nutrient analysis as JSON with keys: mealName, estimatedWeight, nutrients (calories/protein/carbs/fats/fiber/sodium/iron/calcium as numbers), healthScore (1-10), assessment (string), suggestions (string array), nextMeal ({name, reason}), alerts (string array).`;
      aiResponse = await queryText(prompt);
    } else {
      res.status(400).json({ success: false, error: 'Provide either an image file or mealDescription in the body' });
      return;
    }

    // Parse JSON from AI response (may be wrapped in markdown code block)
    let parsed: Record<string, unknown>;
    const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/) || aiResponse.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1]);
    } else {
      // Return raw text if not JSON
      res.json({ success: true, data: { rawAnalysis: aiResponse } });
      return;
    }

    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error('analyzeDiet error:', err);
    const msg = (err as Error).message;
    if (msg.includes('ai/server.py')) {
      res.status(503).json({ success: false, error: 'AI scraper not reachable. Make sure ai/server.py is running.' });
    } else {
      res.status(500).json({ success: false, error: 'Diet analysis failed' });
    }
  }
};
