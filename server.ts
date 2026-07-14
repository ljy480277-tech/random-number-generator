import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lazy init Gemini client
let aiInstance: GoogleGenAI | null = null;
function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing. Please configure it in Secrets.');
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // API Route: Parse receipt image using gemini-3.1-pro-preview
  app.post('/api/parse-receipt', async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Missing imageBase64 parameter.' });
      }

      const ai = getAI();
      const prompt = `Analyze the receipt in this image and extract its structured details. 
Please extract:
1. Restaurant or establishment name
2. Individual line items (each with name and price). Ignore subtotal, tax, and tip as line items.
3. Total Tax
4. Total Tip (if specified on the receipt, otherwise return 0)
5. Subtotal
6. Total bill amount

Make sure to parse prices as numbers, and ensure that items contain unique IDs.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: imageBase64,
            },
          },
          prompt,
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              establishment: {
                type: Type.STRING,
                description: 'The name of the restaurant or establishment.',
              },
              items: {
                type: Type.ARRAY,
                description: 'The list of food or service items purchased.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: 'A unique short identifier for the item (e.g. item_1, item_2)' },
                    name: { type: Type.STRING, description: 'The name of the item.' },
                    price: { type: Type.NUMBER, description: 'The price of the item.' },
                  },
                  required: ['id', 'name', 'price'],
                },
              },
              tax: { type: Type.NUMBER, description: 'Total tax amount.' },
              tip: { type: Type.NUMBER, description: 'Total tip amount.' },
              subtotal: { type: Type.NUMBER, description: 'The subtotal before tax and tip.' },
              total: { type: Type.NUMBER, description: 'The total bill amount.' },
            },
            required: ['establishment', 'items', 'tax', 'tip', 'subtotal', 'total'],
          },
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error('Gemini model returned empty response.');
      }

      const data = JSON.parse(text);
      
      // Post-process to ensure items have clean, unique IDs and correct field formats
      if (data.items && Array.isArray(data.items)) {
        data.items = data.items.map((item: any, index: number) => ({
          id: item.id || `item_${index + 1}`,
          name: item.name || 'Unknown Item',
          price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
          assignedTo: [],
        }));
      }

      // Ensure totals are clean numbers
      data.tax = typeof data.tax === 'number' ? data.tax : parseFloat(data.tax) || 0;
      data.tip = typeof data.tip === 'number' ? data.tip : parseFloat(data.tip) || 0;
      data.subtotal = typeof data.subtotal === 'number' ? data.subtotal : parseFloat(data.subtotal) || 0;
      data.total = typeof data.total === 'number' ? data.total : parseFloat(data.total) || 0;

      // Double check subtotal if it doesn't match sum of items
      const calculatedSubtotal = data.items.reduce((acc: number, item: any) => acc + item.price, 0);
      if (Math.abs(data.subtotal - calculatedSubtotal) > 1.00) {
        data.subtotal = parseFloat(calculatedSubtotal.toFixed(2));
      }
      if (data.total <= 0) {
        data.total = parseFloat((data.subtotal + data.tax + data.tip).toFixed(2));
      }

      return res.json(data);
    } catch (error: any) {
      console.error('Error in /api/parse-receipt:', error);
      return res.status(500).json({ error: error.message || 'Failed to parse receipt' });
    }
  });

  // API Route: Smart Chat Assistant to update split-bill state
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, history, receiptState, people } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Missing message parameter.' });
      }

      const ai = getAI();

      const systemInstruction = `You are a helpful bill-splitting assistant. Your task is to process the user's natural language command and update the bill splitting state accordingly.
You can handle:
1. Assigning items to people (e.g. "Dhruv had the nachos", "Sarah and Sue shared the pizza", "split pizza between John, Mark, and Luke")
2. Unassigning items (e.g. "remove Sarah from pizza", "Dhruv didn't have the nachos")
3. Clearing assignments (e.g. "reset all items", "clear assignments")
4. Adding new items (e.g. "add a Coke for $3.50")
5. Deleting items (e.g. "delete nachos")
6. Adjusting tax or tip (e.g. "make tip $15" or "tax is 8%")
7. Managing people (e.g. "add David to our group", "remove David")

Instructions for updating state:
- Capitalize names consistently (e.g. 'Dhruv', 'Sarah').
- "assignedTo" is an array of strings representing names of people. Multiple people can share an item.
- When assigning/updating, search for item names in the current receipt state that closely match the requested name (e.g., "pizza" matches "Large Pepperoni Pizza", "nachos" matches "Loaded Nachos").
- If the command mentions new people (e.g., "John had the salad" where "John" is not in the people list), make sure to add them to the "people" array.
- If you add or delete items, or adjust tax or tip, recalculate the "subtotal" and "total" in the updated receipt state.
- Formulate a friendly, concise, natural-language explanation of what you did under the "text" property. Keep it short, helpful, and professional.

Current State:
- Known people in the group: ${JSON.stringify(people || [])}
- Receipt: ${JSON.stringify(receiptState || { establishment: '', items: [], tax: 0, tip: 0, subtotal: 0, total: 0 })}

Return a JSON object matching the requested schema.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          ...((history || []).slice(-8).map((msg: any) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.text || msg.content || '' }]
          }))),
          { role: 'user', parts: [{ text: message }] }
        ],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: {
                type: Type.STRING,
                description: 'A friendly and clear explanation of what assignments or changes were made.'
              },
              updatedReceiptState: {
                type: Type.OBJECT,
                properties: {
                  establishment: { type: Type.STRING },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        price: { type: Type.NUMBER },
                        assignedTo: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING }
                        }
                      },
                      required: ['id', 'name', 'price', 'assignedTo']
                    }
                  },
                  tax: { type: Type.NUMBER },
                  tip: { type: Type.NUMBER },
                  subtotal: { type: Type.NUMBER },
                  total: { type: Type.NUMBER }
                },
                required: ['establishment', 'items', 'tax', 'tip', 'subtotal', 'total']
              },
              people: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'The updated complete list of unique people involved in the split.'
              }
            },
            required: ['text', 'updatedReceiptState', 'people']
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error('Gemini model returned empty response.');
      }

      const parsed = JSON.parse(text);
      return res.json(parsed);
    } catch (error: any) {
      console.error('Error in /api/chat:', error);
      return res.status(500).json({ error: error.message || 'Failed to process chat command' });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

startServer();
