import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { cancerType: string } }
) {
  const { cancerType } = params;
  const baseUrl = process.env.API_URL || 'http://localhost:8000/api';
  const apiKey = process.env.API_KEY || 'dev-secret-key';

  try {
    const formData = await request.formData();
    
    const response = await fetch(`${baseUrl}/diagnostic/${cancerType}`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
      body: formData,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ detail: 'Failed to proxy request to backend' }, { status: 500 });
  }
}
