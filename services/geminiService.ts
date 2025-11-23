import { GoogleGenAI, Type } from "@google/genai";
import { Deal, BusinessLead } from "../types";

// Helper to get a fresh API client instance.
// This is crucial because the API key might change during the session (e.g. user selects a new key).
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Generates a list of realistic mock deals based on a location.
 * We use JSON schema to ensure the UI can render it perfectly.
 */
export const fetchNearbyDeals = async (lat: number, lng: number, city: string = "Downtown Area"): Promise<Deal[]> => {
  try {
    const ai = getAiClient();
    const prompt = `Generate 6 realistic local deals/coupons for businesses in a hypothetical or real city similar to ${city} (Lat: ${lat}, Lng: ${lng}). 
    Include a mix of Restaurants (food), Retail stores, and Services. 
    Make them sound exciting and urgent.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              businessName: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              discount: { type: Type.STRING },
              category: { type: Type.STRING, enum: ['food', 'retail', 'service'] },
              distance: { type: Type.STRING, description: "e.g., 0.5 miles" },
              code: { type: Type.STRING },
              expiry: { type: Type.STRING }
            },
            required: ["id", "businessName", "title", "description", "discount", "category", "distance", "code", "expiry"]
          }
        }
      }
    });

    const data = JSON.parse(response.text || '[]');
    
    // Add placeholder images since the text model doesn't return real image URLs
    return data.map((item: any, index: number) => ({
      ...item,
      imageUrl: `https://picsum.photos/400/300?random=${index + Math.floor(Math.random() * 1000)}`
    }));

  } catch (error) {
    console.error("Gemini Deals Error:", error);
    return [];
  }
};

/**
 * Admin Tool: Finds potential business leads in the area to contact.
 */
export const fetchBusinessLeads = async (lat: number, lng: number, city: string = "Downtown"): Promise<BusinessLead[]> => {
  try {
    const ai = getAiClient();
    const prompt = `Generate 5 fictional or realistic small businesses in ${city} (Lat: ${lat}, Lng: ${lng}) that are NOT currently on our platform but would be good candidates for a deals app. 
    Include name, type (e.g. Italian Restaurant), and location.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              type: { type: Type.STRING },
              location: { type: Type.STRING },
              contactStatus: { type: Type.STRING, enum: ['new', 'contacted', 'signed_up'] }
            },
            required: ["id", "name", "type", "location"]
          }
        }
      }
    });

    const data = JSON.parse(response.text || '[]');
    return data.map((item: any) => ({
      ...item,
      contactStatus: 'new' // Default status
    }));
  } catch (error) {
    console.error("Gemini Leads Error:", error);
    return [];
  }
};

/**
 * Admin Tool: Generates a personalized outreach email to a business.
 * Uses Google Search Grounding to find real info about the business if possible.
 */
export const generateOutreachEmail = async (businessName: string, businessType: string) => {
  // We explicitly create a NEW client here to ensure we use the latest API KEY selected by the user
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `I am the owner of "Scout", a local deals app. 
    I want to invite "${businessName}" (${businessType}) to join our platform to offer exclusive coupons.
    Search for this business to find what makes them special, and draft a short, professional, and persuasive email inviting them to join Scout.
    Highlight how they can get more local foot traffic.`;

  // This call might fail with 403 if the user hasn't selected a paid key.
  // We let the error propagate so the UI can handle the key selection flow.
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview', // Using pro model for better reasoning and search tools
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }] // Grounding to find real business details
    }
  });

  // Extract text and any grounding metadata (URLs)
  const text = response.text || "Could not generate email.";
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

  return { text, sources };
};