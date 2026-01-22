import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ocr/badge - Process badge image with OCR
 * This is a placeholder that would integrate with Tesseract.js or cloud OCR service
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // TODO: Implement actual OCR
    // Options:
    // 1. Tesseract.js (client-side or server-side)
    // 2. Google Cloud Vision API
    // 3. AWS Textract
    // 4. Azure Computer Vision

    // For now, return mock data
    // In production, process the image and extract text
    const mockExtractedData = {
      name: "John Smith",
      title: "Director of Operations",
      company: "ACME Logistics",
      email: "john.smith@acme.com",
      phone: "+1 (555) 123-4567",
      confidence: 0.85,
    };

    // Simulated processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return NextResponse.json(mockExtractedData);

    /* 
    // Example with Tesseract.js (uncomment when ready):
    
    const { createWorker } = require('tesseract.js');
    const worker = await createWorker('eng');
    
    const buffer = Buffer.from(await image.arrayBuffer());
    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();
    
    // Parse extracted text to find name, title, company, email, phone
    const lines = text.split('\n').filter(l => l.trim());
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
    const phoneRegex = /[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}/;
    
    const email = lines.find(l => emailRegex.test(l))?.match(emailRegex)?.[0];
    const phone = lines.find(l => phoneRegex.test(l))?.match(phoneRegex)?.[0];
    const name = lines[0]; // Assume first line is name
    const title = lines[1]; // Assume second line is title
    const company = lines[2]; // Assume third line is company
    
    return NextResponse.json({
      name,
      title,
      company,
      email,
      phone,
      rawText: text,
    });
    */

  } catch (error: any) {
    console.error('OCR error:', error);
    return NextResponse.json(
      { error: error.message || 'OCR processing failed' },
      { status: 500 }
    );
  }
}
