
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchLocalPlaces } from './geminiService';

// Mocking GoogleGenAI to isolate tests
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: 'Mock response',
          candidates: [{
            groundingMetadata: {
              groundingChunks: [
                {
                  // Simulating Maps Grounding response
                  maps: {
                    title: 'Mock Sushi Place',
                    googleMapsUri: 'https://maps.google.com/?q=mock',
                    formattedAddress: '123 Sushi St',
                    placeId: '123'
                  }
                },
                {
                    // Simulating Web Fallback
                    web: {
                        title: 'Web Sushi Review',
                        uri: 'https://yelp.com/sushi'
                    }
                }
              ]
            }
          }]
        })
      }
    })),
    Type: { OBJECT: 'OBJECT', STRING: 'STRING', NUMBER: 'NUMBER', ARRAY: 'ARRAY' }
  };
});

describe('geminiService', () => {
  beforeEach(() => {
    // Mock the env var for API key
    vi.stubGlobal('import.meta', { env: { VITE_API_KEY: 'test-key' } });
  });

  it('searchLocalPlaces returns formatted places from Maps data', async () => {
    const results = await searchLocalPlaces('sushi', 34, -118);
    
    // Expect 2 results (one map, one web)
    expect(results).toHaveLength(2);
    
    // Verify Maps Data extraction
    expect(results[0].title).toBe('Mock Sushi Place');
    expect(results[0].uri).toContain('maps.google.com');
    expect(results[0].address).toBe('123 Sushi St');

    // Verify Web Data extraction
    expect(results[1].title).toBe('Web Sushi Review');
  });
});
