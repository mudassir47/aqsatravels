// app/api/send-whatsapp/route.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import axios from 'axios';
// If you plan to use a local image, ensure it's accessible via a public URL or adjust accordingly.
// import img from "@/public/aqsa.png"; // Not used in this example

interface SendWhatsAppRequest {
  number: string;
  message: string;
  type?: 'text' | 'media';
  media_url?: string; // Required if type is 'media'
  filename?: string;  // Required if type is 'media' and sending a document
}

interface SendWhatsAppResponse {
  success: boolean;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendWhatsAppRequest = await request.json();

    const { number, message, type = 'text', media_url, filename } = body;

    // Validate input
    if (!number || !message) {
      return NextResponse.json(
        { success: false, message: 'Number and message are required.' },
        { status: 400 }
      );
    }

    // Basic phone number validation (adjust as needed)
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(number)) {
      return NextResponse.json(
        { success: false, message: 'Invalid phone number format.' },
        { status: 400 }
      );
    }

    // If type is 'media', ensure media_url is provided
    if (type === 'media' && !media_url) {
      return NextResponse.json(
        { success: false, message: 'media_url is required for media type messages.' },
        { status: 400 }
      );
    }

    // Construct payload based on message type
    let payload: any = {
      number: number,
      type: type,
      message: message,
      instance_id: '6728BD5448232',
      access_token: '67277e6184833'
    };

    if (type === 'media') {
      payload.media_url = media_url;
      if (filename) {
        payload.filename = filename;
      }
    }

    // Define the API endpoint
    const apiEndpoint = 'https://adrika.aknexus.in/api/send';

    // Send POST request to the WhatsApp API
    const apiResponse = await axios.post(apiEndpoint, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Handle API response
    if (apiResponse.data.success) {
      return NextResponse.json(
        { success: true, message: 'Message sent successfully.' },
        { status: 200 }
      );
    } else {
      console.error('API Error:', apiResponse.data);
      return NextResponse.json(
        { success: false, message: 'Failed to send message.' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in send-whatsapp API:', error.response?.data || error.message);
    return NextResponse.json(
      { success: false, message: 'An error occurred while sending the message.' },
      { status: 500 }
    );
  }
}
