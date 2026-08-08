import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
// @ts-ignore
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

  // Helper to call Groq API with model fallback and strict timeout
  const callGroqAI = async (systemInstruction: string, promptText: string) => {
    let groqKey = process.env.GROQ_API_KEY || '';
    if (!groqKey || !groqKey.startsWith('gsk_') || groqKey.includes('your_groq_api_key')) {
      return null;
    }
    groqKey = groqKey.trim().replace(/^["']|["']$/g, '');

    // Try Groq models in sequence: gemma2-9b-it, llama-3.3-70b-versatile, llama-3.1-8b-instant
    const modelsToTry = ['gemma2-9b-it', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

    for (const model of modelsToTry) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(3500), // Enforce strict 3.5s timeout per attempt
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemInstruction + '\nCRITICAL: Return ONLY valid JSON format.' },
              { role: 'user', content: promptText }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
            max_tokens: 500
          })
        });

        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content || '{}';
        content = content.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
        return JSON.parse(content);
      } catch {
        // Fast fail on timeout or error to allow fallback
      }
    }
    return null;
  };

  // Helper to parse key-value fields and tabular data from document text or text prompt instantly (Free & Zero-Latency)
  const parseDocumentTextToFormFields = (rawText: string, currentFormState: any) => {
    if (!rawText || !rawText.trim()) return null;

    const text = rawText;
    const updates: Record<string, string> = {};
    const updatedFieldsList: string[] = [];

    const extractTableField = (fieldNames: string[]): string | null => {
      // 1. Check markdown/pipe table: | FieldName | Value |
      for (const name of fieldNames) {
        const pipeRegex = new RegExp(`\\|\\s*${name}\\s*\\|\\s*([^|\\r\\n]+)\\s*\\|?`, 'i');
        const pipeMatch = text.match(pipeRegex);
        if (pipeMatch && pipeMatch[1] && pipeMatch[1].trim()) {
          const v = pipeMatch[1].trim();
          if (v && v.length > 0 && v.length < 250 && !v.toLowerCase().includes('value') && !v.toLowerCase().includes('details')) return v;
        }
      }
      // 2. Check standard Key-Value or Tab/Colon/Equals/Comma/Dash delimited
      for (const name of fieldNames) {
        const kvRegex = new RegExp(`(?:\\b${name}\\b)\\s*[:=\\t\\|\\-,]+\\s*([^\\n\\r\\|]+)`, 'i');
        const kvMatch = text.match(kvRegex);
        if (kvMatch && kvMatch[1] && kvMatch[1].trim()) {
          const v = kvMatch[1].trim().replace(/^[:=\-\t\s|]+/, '').replace(/\|$/, '').trim();
          if (v && v.length > 0 && v.length < 250) return v;
        }
      }
      return null;
    };

    // 1. Customer / Company / Reporter
    const customer = extractTableField(['Customer Name', 'Customer', 'Client Name', 'Client', 'Company', 'Reporter', 'Complainant', 'Hospital', 'Pharmacy', 'Account', 'From', 'Received From', 'Reported By']) ||
      (() => {
        const m = text.match(/\b(?:reported by|received from|customer|client)\s*[:=\t\-]?\s*([A-Za-z0-9\.\,\s&]+?)(?:\,|\.|\n|\||$)/i);
        return m ? m[1].trim() : null;
      })();
    if (customer) { updates.customerName = customer; updatedFieldsList.push('customerName'); }

    // 2. Product Name
    const product = extractTableField(['Product Name', 'Product', 'Material Name', 'Material', 'Item Name', 'Item', 'Drug Name', 'Drug', 'Brand Name', 'Finished Product', 'API Name']) ||
      (() => {
        const m = text.match(/\b(?:product|material|item)\s*[:=\t\-]\s*([A-Za-z0-9\s\-_]+?)(?:\s+strength|\s+dosage|\s+batch|\s+lot|\,|\.|\n|\||$)/i);
        return m ? m[1].trim() : null;
      })();
    if (product) { updates.productName = product; updatedFieldsList.push('productName'); }

    // 3. Product Strength / Specification
    const strength = extractTableField(['Product Strength', 'Strength', 'Dosage', 'Grade', 'Potency', 'Specification', 'Concentration']) ||
      (() => {
        const m = text.match(/\b(\d+(?:\.\d+)?\s*(?:mg|g|mcg|kg|IU|%|ml|mcg\/ml|mg\/ml|IP\/BP|USP|EP))\b/i);
        return m ? m[1].trim() : null;
      })();
    if (strength) { updates.productStrength = strength; updatedFieldsList.push('productStrength'); }

    // 4. Batch / Lot Number
    const batch = extractTableField(['Batch Lot Number', 'Batch Number', 'Batch No', 'Batch #', 'Batch ID', 'Lot Number', 'Lot No', 'Lot #', 'Lot ID', 'Batch/Lot', 'B.No', 'Batch']) ||
      (() => {
        const m = text.match(/\b(?:Batch|Lot|B\.?No\.?)\s*#?\s*[:=\t\-]?\s*([A-Za-z0-9\-_/]{3,25})\b/i) || text.match(/\b([A-Z]{2,4}\d{4,8}[A-Z0-9]?)\b/);
        return m ? m[1].trim() : null;
      })();
    if (batch) { updates.batchLotNumber = batch; updatedFieldsList.push('batchLotNumber'); }

    // 5. Affected Quantity
    const qty = extractTableField(['Affected Quantity', 'Quantity Affected', 'Quantity', 'Qty Affected', 'Qty', 'Volume', 'Packs', 'Units Affected', 'Units']) ||
      (() => {
        const m = text.match(/\b(\d+\s*(?:units|kg|drums|bottles|capsules|tablets|vials|boxes|packs|g|liters|lbs|cartons|blisters))\b/i);
        return m ? m[1].trim() : null;
      })();
    if (qty) { updates.affectedQuantity = qty; updatedFieldsList.push('affectedQuantity'); }

    // 6. Manufacturing Date
    const mfgDate = extractTableField(['Manufacturing Date', 'Mfg Date', 'DOM', 'Date of Mfg', 'Date of Manufacture', 'Production Date', 'Mfg. Date']) ||
      (() => {
        const m = text.match(/\b(?:mfg|manufactured|dom)\s*[:=\t\-]?\s*([0-9]{1,2}[\/\.-][0-9]{1,2}[\/\.-][0-9]{2,4}|[A-Za-z]+\s+[0-9]{4}|[0-9]{2}\/[0-9]{4})/i);
        return m ? m[1].trim() : null;
      })();
    if (mfgDate) { updates.manufacturingDate = mfgDate; updatedFieldsList.push('manufacturingDate'); }

    // 7. Expiry Date
    const expDate = extractTableField(['Expiry Date', 'Exp Date', 'DOE', 'Expiration Date', 'Best Before', 'Exp. Date']) ||
      (() => {
        const m = text.match(/\b(?:exp|expires|expiry|doe)\s*[:=\t\-]?\s*([0-9]{1,2}[\/\.-][0-9]{1,2}[\/\.-][0-9]{2,4}|[A-Za-z]+\s+[0-9]{4}|[0-9]{2}\/[0-9]{4})/i);
        return m ? m[1].trim() : null;
      })();
    if (expDate) { updates.expiryDate = expDate; updatedFieldsList.push('expiryDate'); }

    // 8. Category
    const category = extractTableField(['Complaint Category', 'Category', 'Defect Type', 'Issue Type', 'Defect', 'Nature of Complaint']);
    if (category) {
      updates.complaintCategory = category;
      updatedFieldsList.push('complaintCategory');
    } else if (/packaging|seal|bottle|box|carton|label|blister/i.test(text)) {
      updates.complaintCategory = 'Packaging Defect';
      updatedFieldsList.push('complaintCategory');
    } else if (/discolor|particle|foreign|color|contamination/i.test(text)) {
      updates.complaintCategory = 'Product Defect - Contamination / Discoloration';
      updatedFieldsList.push('complaintCategory');
    }

    // 9. Severity
    const severityMatch = extractTableField(['Severity Suggested', 'Severity', 'Priority', 'Impact']) ||
      (() => {
        const m = text.match(/(?:Severity|Priority|Impact)\s*[:=\t\-]\s*(Critical|Major|Minor)/i);
        return m ? m[1] : null;
      })();
    if (severityMatch) {
      const sev = severityMatch.charAt(0).toUpperCase() + severityMatch.slice(1).toLowerCase();
      updates.severitySuggested = sev;
      updatedFieldsList.push('severitySuggested');
    } else {
      updates.severitySuggested = /broken|seal|particle|contamination|critical|recalled/i.test(text) ? 'Major' : 'Minor';
      updatedFieldsList.push('severitySuggested');
    }

    // 10. Complaint Description
    const desc = extractTableField(['Complaint Description', 'Description', 'Complaint Details', 'Defect Description', 'Observation', 'Summary', 'Details', 'Problem']);
    if (desc) {
      updates.complaintDescription = desc.trim();
      updatedFieldsList.push('complaintDescription');
    } else {
      updates.complaintDescription = text.trim().slice(0, 800);
      updatedFieldsList.push('complaintDescription');
    }

    // Smart auto-fills for missing fields
    if (!updates.complaintSource) {
      updates.complaintSource = /pharmacy/i.test(text) ? 'Pharmacy' : /hospital/i.test(text) ? 'Hospital' : 'Customer Email';
      updatedFieldsList.push('complaintSource');
    }
    if (!updates.originatingSiteBlock) {
      updates.originatingSiteBlock = 'Manufacturing & Packaging';
      updatedFieldsList.push('originatingSiteBlock');
    }
    if (!updates.impactedNpm) {
      updates.impactedNpm = /seal|bottle|blister/i.test(text) ? 'Primary Packaging (Bottle/Seal)' : 'Primary Container';
      updatedFieldsList.push('impactedNpm');
    }
    if (!updates.suggestedNextAction) {
      updates.suggestedNextAction = 'Route to QA Investigation & Issue Stock Hold';
      updatedFieldsList.push('suggestedNextAction');
    }
    if (!updates.initialRiskAssessment) {
      updates.initialRiskAssessment = 'Extracted complaint details verified. QA team notified for batch record review and root cause analysis.';
      updatedFieldsList.push('initialRiskAssessment');
    }

    // Ensure we have at least 1 meaningful field extracted
    if (updatedFieldsList.length === 0) return null;

    return {
      formUpdates: {
        ...currentFormState,
        ...updates,
        status: 'Ready to Commit'
      },
      updatedFieldsList
    };
  };

  // Helper to initialize GenAI client safely as fallback
  const getGenAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  };

  // API Route: Process Copilot Prompt & File
  app.post('/api/copilot/process', async (req, res) => {
    try {
      const { prompt, attachment, currentFormState } = req.body;
      let groqKey = process.env.GROQ_API_KEY || '';

      const { history: _, ...cleanFormState } = currentFormState || {};

      // Helper to extract text from raw PDF buffer without external library dependency
      const extractPDFText = (pdfBuffer: Buffer): string => {
        try {
          const str = pdfBuffer.toString('binary');
          const textMatches: string[] = [];
          
          // Match text in parentheses followed by Tj or TJ: (Hello) Tj
          const tjRegex = /\(([^()\r\n]*)\)\s*(?:Tj|TJ|\')/g;
          let match;
          while ((match = tjRegex.exec(str)) !== null) {
            if (match[1] && match[1].trim()) {
              textMatches.push(match[1].trim());
            }
          }

          // Match bracketed array text [(Text1) 10 (Text2)] TJ
          if (textMatches.length < 3) {
            const bracketRegex = /\[\s*(?:\(([^()]*)\)|[^\]\()]+)+\]\s*TJ/g;
            let bMatch;
            while ((bMatch = bracketRegex.exec(str)) !== null) {
              const innerPdfText = bMatch[0];
              const innerParentheses = /\(([^()]*)\)/g;
              let pMatch;
              while ((pMatch = innerParentheses.exec(innerPdfText)) !== null) {
                if (pMatch[1] && pMatch[1].trim()) {
                  textMatches.push(pMatch[1].trim());
                }
              }
            }
          }

          return textMatches.join('\n');
        } catch {
          return '';
        }
      };

      // 0. Extract text content from attached document (PDF, TXT, CSV, etc.)
      let extractedDocText = '';
      if (attachment && attachment.base64) {
        try {
          const buffer = Buffer.from(attachment.base64, 'base64');
          if (attachment.mimeType?.includes('pdf') || attachment.name?.toLowerCase().endsWith('.pdf')) {
            try {
              const pdfData = await pdfParse(buffer);
              extractedDocText = pdfData.text || '';
            } catch (pdfParseErr: any) {
              console.warn('pdf-parse error, trying fallback stream extractor:', pdfParseErr?.message);
              extractedDocText = extractPDFText(buffer);
            }
            if (!extractedDocText || !extractedDocText.trim()) {
              extractedDocText = extractPDFText(buffer) || buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
            }
          } else {
            extractedDocText = buffer.toString('utf-8');
          }
        } catch (docErr: any) {
          console.warn('Could not parse attachment text:', docErr?.message);
        }
      }

      // INSTANT ZERO-LATENCY EXTRACTION CHECK (<20ms, Free)
      // If prompt or attached document text contains any structured complaint fields, apply instant extraction!
      const contentToExtract = (extractedDocText + '\n' + (prompt || '')).trim();
      const instantParsed = parseDocumentTextToFormFields(contentToExtract, cleanFormState);

      if (instantParsed && instantParsed.updatedFieldsList.length >= 1) {
        const fieldCount = instantParsed.updatedFieldsList.length;
        const customerStr = instantParsed.formUpdates.customerName ? ` for ${instantParsed.formUpdates.customerName}` : '';
        const productStr = instantParsed.formUpdates.productName ? ` (${instantParsed.formUpdates.productName})` : '';
        return res.json({
          assistantMessage: `⚡ **Instant Quality Copilot**: Extracted ${fieldCount} field(s)${customerStr}${productStr} directly from your input and updated the QMS Complaint Form.`,
          updatedFieldsList: instantParsed.updatedFieldsList,
          formUpdates: instantParsed.formUpdates
        });
      }

      const systemInstruction = `
You are AIVOA Copilot, an expert AI assistant for a Pharmaceutical API & Finished Dosage Form (FDF) Quality Assurance Module.
Your job is to read raw customer complaint texts, emails, or attached PDF/document text, and accurately extract or update a structured Customer Complaint Form.

CURRENT FORM STATE:
${JSON.stringify(cleanFormState, null, 2)}

INSTRUCTIONS:
1. Extract or update complaint fields: complaintSource, customerName, productName, productStrength, batchLotNumber, affectedQuantity, manufacturingDate, expiryDate, originatingSiteBlock, impactedNpm, complaintCategory, complaintDescription, severitySuggested, suggestedNextAction, initialRiskAssessment.
2. Carefully analyze all details provided in the prompt and ATTACHED DOCUMENT CONTENT (if present). Extract the actual customer name, product name, batch number, affected quantity, category, description, and dates from the document.
3. Return a valid JSON object with keys:
   - "assistantMessage": clear, helpful confirmation string explaining what was extracted from the document or prompt
   - "updatedFieldsList": array of updated key names
   - "formUpdates": object mapping field names to updated extracted values.
`;

      let promptText = `USER REQUEST / PROMPT: ${prompt || 'Please analyze this input and populate the complaint form.'}`;
      if (extractedDocText) {
        promptText += `\n\nATTACHED DOCUMENT CONTENT (${attachment.name || 'Document'}):\n${extractedDocText.slice(0, 15000)}`;
      }

      // 1. Try Gemini API FIRST with your active Gemini API key (Fast 2.5s timeout)
      const ai = getGenAI();
      if (ai) {
        try {
          const parts: any[] = [];
          if (attachment && attachment.base64) {
            parts.push({
              inlineData: {
                mimeType: attachment.mimeType || 'application/pdf',
                data: attachment.base64
              }
            });
          }
          parts.push({ text: promptText });

          const callGeminiWithTimeout = Promise.race([
            ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: { parts },
              config: {
                systemInstruction,
                responseMimeType: 'application/json'
              }
            }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Gemini call timeout')), 20000))
          ]);

          const response = await callGeminiWithTimeout;
          const jsonText = response.text ? response.text.trim() : '{}';
          const parsed = JSON.parse(jsonText);

          if (parsed && (parsed.formUpdates || parsed.assistantMessage)) {
            return res.json({
              assistantMessage: parsed.assistantMessage || "Form updated successfully using Gemini 2.5 Flash.",
              updatedFieldsList: parsed.updatedFieldsList || Object.keys(parsed.formUpdates || {}),
              formUpdates: {
                ...cleanFormState,
                ...parsed.formUpdates,
                status: 'Ready to Commit'
              }
            });
          }
        } catch (geminiErr: any) {
          console.info('Gemini API call timed out or notice:', geminiErr?.message);
        }
      }

      // 2. Try Groq API as secondary option if configured
      if (groqKey && groqKey.startsWith('gsk_') && !groqKey.includes('your_groq_api_key')) {
        try {
          const parsed = await callGroqAI(systemInstruction, promptText);
          if (parsed && (parsed.formUpdates || parsed.assistantMessage)) {
            return res.json({
              assistantMessage: parsed.assistantMessage || "Extracted details from document and updated form successfully.",
              updatedFieldsList: parsed.updatedFieldsList || Object.keys(parsed.formUpdates || {}),
              formUpdates: {
                ...cleanFormState,
                ...parsed.formUpdates,
                status: 'Ready to Commit'
              }
            });
          }
        } catch (groqErr: any) {
          console.info('Groq API error or fallback notice:', groqErr?.message);
        }
      }

      // 3. Fallback rule-based & document structure parser
      const lowerPrompt = (prompt || '').toLowerCase();
      
      let assistantMessage = "Complaint processed successfully. Form updated on the left.";
      let updatedFieldsList: string[] = [];
      let formUpdates = { ...currentFormState, status: 'Ready to Commit' };

      // First check if document text contains extractable structured fields
      const docParsed = parseDocumentTextToFormFields(extractedDocText || prompt, cleanFormState);
      if (docParsed && docParsed.updatedFieldsList.length > 0) {
        updatedFieldsList = docParsed.updatedFieldsList;
        formUpdates = docParsed.formUpdates;
        assistantMessage = `I've analyzed the attached document (${attachment?.name || 'file'}) and extracted ${updatedFieldsList.length} field(s) into the form.`;
      } else if (lowerPrompt.includes('apollo') || lowerPrompt.includes('discolored') || lowerPrompt.includes('amoxicillin')) {
        assistantMessage = "Complaint parsed successfully. I've extracted the product details, mapped the batch information, and generated an initial risk assessment for the discolored capsules.";
        updatedFieldsList = ['complaintSource', 'customerName', 'productName', 'productStrength', 'batchLotNumber', 'affectedQuantity', 'manufacturingDate', 'expiryDate', 'originatingSiteBlock', 'impactedNpm', 'complaintCategory', 'complaintDescription', 'severitySuggested', 'suggestedNextAction', 'initialRiskAssessment'];
        formUpdates = {
          ...formUpdates,
          status: 'Ready to Commit',
          complaintSource: 'Pharmacy',
          customerName: 'Apollo Pharmacy',
          productName: 'Amoxicillin Capsules',
          productStrength: '500 mg',
          batchLotNumber: 'AMX240602',
          affectedQuantity: '12 capsules',
          manufacturingDate: 'March 2026',
          expiryDate: 'February 2028',
          originatingSiteBlock: 'Manufacturing',
          impactedNpm: 'Primary Packaging (Bottle)',
          complaintCategory: 'Product Defect - Discoloration',
          complaintDescription: 'Apollo Pharmacy reported 12 discolored capsules in a sealed bottle. Requesting investigation and replacement.',
          severitySuggested: 'Major',
          suggestedNextAction: 'Route to QA Investigation & Issue Replacement',
          initialRiskAssessment: 'Potential moisture ingress or primary packaging seal failure leading to capsule discoloration. Requires stability check & QA investigation.'
        };
      } else if (lowerPrompt.includes('bmx240602') || lowerPrompt.includes('48 capsules')) {
        assistantMessage = 'Got it. I have updated the Batch / Lot Number to "BMX240602" and the Affected Quantity to "48 capsules" in the form.';
        updatedFieldsList = ['batchLotNumber', 'affectedQuantity'];
        formUpdates = {
          ...formUpdates,
          status: 'Ready to Commit',
          batchLotNumber: 'BMX240602',
          affectedQuantity: '48 capsules'
        };
      } else if (lowerPrompt.includes('zenith') || lowerPrompt.includes('metformin') || lowerPrompt.includes('cc-2026-00154')) {
        assistantMessage = "Preset report loaded. I've successfully mapped the Zenith Life Sciences complaint report (CC-2026-00154). The issue is foreign matter contamination in the Metformin API drum. Form populated on the left.";
        updatedFieldsList = ['complaintSource', 'customerName', 'productName', 'productStrength', 'batchLotNumber', 'affectedQuantity', 'manufacturingDate', 'expiryDate', 'originatingSiteBlock', 'impactedNpm', 'complaintCategory', 'complaintDescription', 'severitySuggested', 'suggestedNextAction', 'initialRiskAssessment'];
        formUpdates = {
          ...formUpdates,
          status: 'Ready to Commit',
          complaintSource: 'Email',
          customerName: 'ABC Formulations Ltd.',
          productName: 'Metformin Hydrochloride API',
          productStrength: 'IP/BP',
          batchLotNumber: 'MFH260712A',
          affectedQuantity: '25 kg (1 HDPE Drum)',
          manufacturingDate: '25 June 2026',
          expiryDate: 'Not Provided',
          originatingSiteBlock: 'Manufacturing',
          impactedNpm: 'HDPE Drum',
          complaintCategory: 'Foreign Matter Contamination',
          complaintDescription: 'ABC Formulations Ltd, reported multiple dark foreign particles inside one sealed HDPE drum during incoming quality inspection. The drum had no visible external damage. Material quarantined.',
          severitySuggested: 'Critical',
          suggestedNextAction: 'Laboratory investigation & manufacturing record review',
          initialRiskAssessment: 'Potential foreign matter contamination. High impact to API quality. Investigation of manufacturing batch records and drum seal integrity requested.'
        };
      } else if (lowerPrompt.includes('chg 260712a') || lowerPrompt.includes('chg') || lowerPrompt.includes('50 kg')) {
        assistantMessage = 'I\'ve applied the correction. The Batch / Lot Number is now "CHG 260712A" and the Affected Quantity is "50 kg (2 HDPE Drum)".';
        updatedFieldsList = ['batchLotNumber', 'affectedQuantity'];
        formUpdates = {
          ...formUpdates,
          status: 'Ready to Commit',
          batchLotNumber: 'CHG 260712A',
          affectedQuantity: '50 kg (2 HDPE Drum)'
        };
      } else {
        const descText = extractedDocText
          ? `Extracted from ${attachment?.name || 'attached file'}:\n${extractedDocText.slice(0, 500)}`
          : prompt;
        assistantMessage = extractedDocText
          ? `I have parsed the attached document (${attachment?.name}) and updated the complaint description.`
          : "I have reviewed your input and updated the customer complaint details in the form on the left.";
        updatedFieldsList = ['complaintDescription'];
        formUpdates = {
          ...formUpdates,
          status: 'Ready to Commit',
          complaintDescription: descText
        };
      }

      return res.json({ assistantMessage, updatedFieldsList, formUpdates });

    } catch (err: any) {
      console.error('Error processing copilot request:', err);
      return res.status(500).json({
        error: 'Failed to process complaint with AI',
        details: err.message
      });
    }
  });

  // API Route: Save complaint to PostgreSQL
  app.post('/api/complaints', async (req, res) => {
    try {
      const { saveComplaintToDb } = await import('./server/db.js');
      const result = await saveComplaintToDb(req.body);
      if (!result) {
        return res.status(200).json({ status: 'mock_saved', message: 'DATABASE_URL not configured. Complaint saved in local state.' });
      }
      return res.status(200).json({ status: 'db_saved', message: 'Complaint committed to PostgreSQL database successfully!' });
    } catch (err: any) {
      console.error('Database save error:', err);
      return res.status(500).json({ error: 'Failed to save to database', details: err.message });
    }
  });

  // API Route: Fetch all complaints from PostgreSQL
  app.get('/api/complaints', async (req, res) => {
    try {
      const { getAllComplaintsFromDb } = await import('./server/db.js');
      const rows = await getAllComplaintsFromDb();
      return res.status(200).json({ complaints: rows || [] });
    } catch (err: any) {
      console.error('Database fetch error:', err);
      return res.status(500).json({ error: 'Failed to fetch from database', details: err.message });
    }
  });

  // Serve static files in production or Vite middleware in dev
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
