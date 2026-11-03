import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for Gemini document parsing

export async function POST(request: Request) {
  try {
    let fileBuffer: Buffer | null = null;
    let mimeType = 'application/pdf';
    let filename = '';

    const contentType = request.headers.get('content-type') || '';

    // 1. Get file data either from FormData or JSON { fileUrl, apiKey }
    let clientApiKey = request.headers.get('x-gemini-key') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (body.apiKey) clientApiKey = body.apiKey;
      const fileUrl = body.fileUrl as string;

      if (!fileUrl) {
        return NextResponse.json({ error: 'กรุณาระบุ fileUrl ที่ต้องการสแกน' }, { status: 400 });
      }

      // Lookup file from Cloud Database
      const basename = path.basename(decodeURIComponent(fileUrl));
      const dbFile = await prisma.uploadedFile.findFirst({
        where: {
          OR: [{ filename: basename }, { filename: decodeURIComponent(fileUrl) }],
        },
      });

      if (dbFile && dbFile.data) {
        fileBuffer = Buffer.from(dbFile.data);
        mimeType = dbFile.mimeType || 'application/pdf';
        filename = dbFile.originalName || dbFile.filename;
      } else {
        // Fallback to local filesystem
        const localPath = path.join(process.cwd(), 'public', 'uploads', basename);
        try {
          fileBuffer = await fs.readFile(localPath);
          const ext = path.extname(basename).toLowerCase();
          if (ext === '.pdf') mimeType = 'application/pdf';
          else if (ext === '.png') mimeType = 'image/png';
          else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
          else if (ext === '.webp') mimeType = 'image/webp';
          filename = basename;
        } catch {
          return NextResponse.json({ error: 'ไม่พบไฟล์ในระบบ' }, { status: 404 });
        }
      }
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const key = formData.get('apiKey') as string | null;
      if (key) clientApiKey = key;

      if (!file) {
        return NextResponse.json({ error: 'ไม่พบไฟล์ที่ต้องการอัปโหลด' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      fileBuffer = Buffer.from(bytes);
      mimeType = file.type || 'application/pdf';
      filename = file.name;
    }

    if (!fileBuffer) {
      return NextResponse.json({ error: 'ไม่สามารถอ่านข้อมูลไฟล์ได้' }, { status: 400 });
    }

    // 2. Discover Gemini API Key
    let apiKey = clientApiKey || process.env.GEMINI_API_KEY || '';

    if (!apiKey) {
      const settings = await prisma.companySettings.findUnique({
        where: { id: 'default' },
      });
      if (settings?.geminiApiKey) {
        apiKey = settings.geminiApiKey;
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'MISSING_API_KEY',
          message:
            'ยังไม่ได้ระบุ Gemini API Key กรุณาระบุ API Key เพื่อเปิดใช้งานระบบ AI สแกนเอกสาร (รับฟรีได้ที่ aistudio.google.com)',
        },
        { status: 400 }
      );
    }

    // 3. Initialize GoogleGenAI SDK
    const ai = new GoogleGenAI({ apiKey });

    const base64Data = fileBuffer.toString('base64');

    const prompt = `You are an expert construction & engineering Quantity Surveyor (QS) specialized in Bill of Quantities (BOQ) and Quotation analysis in Thailand.
Carefully analyze this attached document (which is a BOQ, Quotation, or Price Estimate) and extract ALL categories and line items into structured JSON.

Return ONLY a valid JSON object matching this schema:
{
  "title": "ชื่องาน หรือชื่อโครงการที่ระบุในเอกสาร",
  "customerName": "ชื่อลูกค้า / โรงพยาบาล ที่ระบุในเอกสาร",
  "workingLocation": "สถานที่ปฏิบัติงาน",
  "categories": [
    {
      "name": "ชื่อหมวดงาน (เช่น หมวดที่ 1 งานรื้อถอนและเตรียมพื้นที่)",
      "items": [
        {
          "itemNo": 1,
          "description": "รายละเอียดงาน / อุปกรณ์",
          "specification": "สเปก ยี่ห้อ ขนาด หรือรายละเอียดเพิ่มเติม",
          "unit": "หน่วย (เช่น JOB, ชุด, จุด, ตร.ม., ม., เครื่อง, งาน)",
          "quantity": 1,
          "materialPrice": 0,
          "laborPrice": 0,
          "unitPrice": 0,
          "amount": 0,
          "notes": ""
        }
      ]
    }
  ],
  "subtotal": 0,
  "discountAmount": 0,
  "overheadRate": 10,
  "overheadAmount": 0,
  "vatRate": 7.0,
  "grandTotal": 0,
  "notes": "หมายเหตุหรือเงื่อนไขสำคัญที่พบในเอกสาร"
}

Critical Instructions:
1. Extract EVERY SINGLE line item accurately. Do not combine, shorten, or omit items.
2. If separate Material (ค่าของ) and Labor (ค่าแรง) are listed, put them in materialPrice and laborPrice. If only single unit price is listed, set unitPrice and amount.
3. Ensure unitPrice = materialPrice + laborPrice.
4. Ensure amount = quantity * unitPrice.
5. All numeric values must be pure numbers without comma formatting.
6. Preserve exact Thai text and terminology from the original document.`;

    // 4. Generate content with Gemini
    let responseText = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });
      responseText = response.text || '';
    } catch (primaryErr: any) {
      console.warn('Gemini 2.0 Flash attempt failed, retrying with gemini-1.5-flash:', primaryErr?.message || primaryErr);
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });
      responseText = fallbackResponse.text || '';
    }
    if (!responseText) {
      return NextResponse.json({ error: 'AI ไม่สามารถสกัดข้อมูลจากเอกสารนี้ได้' }, { status: 500 });
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      // Clean possible markdown code fences
      const cleaned = responseText.replace(/```json\s*|\s*```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    // 5. Mathematical Cross-Checking & Post-Processing
    const categories = parsedData.categories || [];
    let totalItems = 0;
    let mathWarnings: string[] = [];
    let calculatedSubtotal = 0;

    categories.forEach((cat: any, cIdx: number) => {
      cat.name = cat.name || `หมวดที่ ${cIdx + 1}`;
      let catSubtotal = 0;

      (cat.items || []).forEach((item: any, iIdx: number) => {
        totalItems++;
        item.itemNo = Number(item.itemNo) || (iIdx + 1);
        item.description = item.description || '-';
        item.specification = item.specification || '';
        item.unit = item.unit || 'JOB';
        item.quantity = Number(item.quantity) || 1;
        item.materialPrice = Number(item.materialPrice) || 0;
        item.laborPrice = Number(item.laborPrice) || 0;

        let uPrice = Number(item.unitPrice) || 0;
        if (uPrice === 0 && (item.materialPrice > 0 || item.laborPrice > 0)) {
          uPrice = item.materialPrice + item.laborPrice;
        }
        item.unitPrice = uPrice;

        const expectedAmt = Math.round(item.quantity * uPrice * 100) / 100;
        const statedAmt = Number(item.amount) || expectedAmt;
        item.amount = statedAmt;

        // Check if arithmetic matches
        if (statedAmt > 0 && Math.abs(expectedAmt - statedAmt) > 1.0) {
          const warningMsg = `แถวที่ ${item.itemNo} (${item.description}): จำนวน (${item.quantity}) × ราคาต่อหน่วย (${uPrice}) = ${expectedAmt} ไม่ตรงกับยอดรวมในเอกสาร (${statedAmt})`;
          mathWarnings.push(warningMsg);
          item.mathWarning = `คำนวณได้ ฿${expectedAmt.toLocaleString()} แต่เอกสารระบุ ฿${statedAmt.toLocaleString()}`;
        }

        catSubtotal += statedAmt;
      });

      cat.subtotal = catSubtotal;
      calculatedSubtotal += catSubtotal;
    });

    return NextResponse.json({
      success: true,
      data: {
        title: parsedData.title || '',
        customerName: parsedData.customerName || '',
        workingLocation: parsedData.workingLocation || '',
        categories,
        subtotal: calculatedSubtotal > 0 ? calculatedSubtotal : Number(parsedData.subtotal) || 0,
        discountAmount: Number(parsedData.discountAmount) || 0,
        overheadRate: Number(parsedData.overheadRate) || 10,
        vatRate: Number(parsedData.vatRate) || 7.0,
        grandTotal: Number(parsedData.grandTotal) || calculatedSubtotal,
        notes: parsedData.notes || '',
        sourceFilename: filename,
        itemCount: totalItems,
        categoryCount: categories.length,
        mathVerification: {
          isValid: mathWarnings.length === 0,
          warningsCount: mathWarnings.length,
          warnings: mathWarnings,
        },
      },
    });
  } catch (err: any) {
    console.error('AI BOQ extraction error:', err);
    return NextResponse.json(
      {
        error: 'AI_EXTRACTION_FAILED',
        message: err.message || 'เกิดข้อผิดพลาดในการประมวลผลด้วย AI',
      },
      { status: 500 }
    );
  }
}
