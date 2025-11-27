
import { GoogleGenAI, Type } from "@google/genai";
import { Deal, BusinessLead } from "../types";

// Helper to safely get the API Key from either Vite env or process.env
const getApiKey = (): string => {
  try {
    // Check Vite Env (Primary)
    const env = (import.meta as any).env;
    if (env?.VITE_API_KEY) return env.VITE_API_KEY;
    
    // Check Process Env (Fallback)
    if (process.env.API_KEY) return process.env.API_KEY;
    if (process.env.VITE_API_KEY) return process.env.VITE_API_KEY;
  } catch (e) {}

  return '';
};

// Helper to get a fresh API client instance.
const getAiClient = () => {
  const key = getApiKey();
  if (!key) throw new Error("Missing API Key. Please set VITE_API_KEY in Vercel.");
  return new GoogleGenAI({ apiKey: key });
};

/**
 * Uses Gemini to determine the city name from coordinates (Reverse Geocoding).
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
        const ai = getAiClient();
        const prompt = `What city and country is at Latitude: ${lat}, Longitude: ${lng}? Return only the city name (e.g., "San Francisco" or "Mumbai"). Do not add any other text.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        const text = response.text?.trim();
        return text || "Unknown Location";
    } catch (error) {
        console.error("Reverse Geocode Error:", error);
        return "Current Location";
    }
};

/**
 * Uses Gemini to find coordinates for a searched city (Geocoding).
 */
export const geocodeCity = async (query: string): Promise<{ lat: number, lng: number, city: string } | null> => {
    try {
        const ai = getAiClient();
        const prompt = `Return the latitude and longitude for the city: "${query}". 
        Return JSON format: { "lat": number, "lng": number, "city": "Formatted City Name" }`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        lat: { type: Type.NUMBER },
                        lng: { type: Type.NUMBER },
                        city: { type: Type.STRING }
                    },
                    required: ["lat", "lng", "city"]
                }
            }
        });

        return JSON.parse(response.text || 'null');
    } catch (error) {
        console.error("Geocode Error:", error);
        return null;
    }
};

/**
 * Generates a list of realistic mock deals based on a location.
 * We use JSON schema to ensure the UI can render it perfectly.
 */
export const fetchNearbyDeals = async (lat: number, lng: number, city: string = "Downtown Area"): Promise<Deal[]> => {
  try {
    const ai = getAiClient();
    const prompt = `Generate 6 realistic local deals/coupons for businesses in ${city} (Lat: ${lat}, Lng: ${lng}). 
    If the location is in India, use INR/Rupees currency and appropriate business names.
    Include a mix of Restaurants (food), Retail stores, and Services. 
    Make them sound exciting and urgent.
    Include a realistic website URL for each business.`;

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
              expiry: { type: Type.STRING },
              website: { type: Type.STRING, description: "Full URL starting with http" }
            },
            required: ["id", "businessName", "title", "description", "discount", "category", "distance", "code", "expiry", "website"]
          }
        }
      }
    });

    const data = JSON.parse(response.text || '[]');
    
    // Add placeholder images since the text model doesn't return real image URLs
    return data.map((item: any, index: number) => ({
      ...item,
      business_id: `ai-gen-${index}`, // Placeholder ID for AI deals to satisfy type requirement
      imageUrl: `https://picsum.photos/400/300?random=${index + Math.floor(Math.random() * 1000)}`
    }));

  } catch (error) {
    console.error("Gemini Deals Error:", error);
    // STRICTLY return empty array on error to prevent fake data in production
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
  // We explicitly create a NEW client here to ensure we use the latest API KEY
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  const prompt = `I am the owner of "Lokal", a local deals app for the East Coast, USA. 
    I want to invite "${businessName}" (${businessType}) to join our platform to offer exclusive coupons.
    
    My Contact Info (include this at the bottom):
    Email: soodrah@gmail.com
    Phone: 9195610974
    
    Search for this business to find what makes them special, and draft a short, professional, and persuasive email inviting them to join Lokal.
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
