// api/whatsapp/route.ts

import { NextResponse } from 'next/server'
import { Client, LocalAuth } from 'whatsapp-web.js'
import qrcode from 'qrcode'

let client: Client | null = null
let isClientInitialized = false
let isClientAuthenticated = false
let lastQrCode: string | null = null

async function initializeClient() {
  if (!client) {
    client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: { headless: true },
    })

    client.on('qr', async (qr) => {
      console.log('QR RECEIVED', qr)
      lastQrCode = await qrcode.toDataURL(qr)
    })

    client.on('ready', () => {
      console.log('Client is ready!')
      isClientAuthenticated = true
      lastQrCode = null
    })

    client.on('authenticated', () => {
      console.log('Client authenticated!')
      isClientAuthenticated = true
      lastQrCode = null
    })

    client.on('auth_failure', (msg) => {
      console.error('AUTHENTICATION FAILURE', msg)
      isClientAuthenticated = false
      lastQrCode = null
    })

    await client.initialize()
    isClientInitialized = true
  }
}

export async function POST(request: Request) {
  const { phoneNumber, message } = await request.json()

  if (!phoneNumber || !message) {
    return NextResponse.json({ success: false, error: 'Missing phoneNumber or message' }, { status: 400 })
  }

  await initializeClient()

  if (!isClientAuthenticated) {
    // Client is not authenticated, return QR code
    if (lastQrCode) {
      return NextResponse.json({ success: false, requiresQr: true, qrCode: lastQrCode })
    } else {
      // Wait for QR code to be generated
      try {
        const qrCode = await waitForQrCode()
        return NextResponse.json({ success: false, requiresQr: true, qrCode })
      } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to generate QR code' }, { status: 500 })
      }
    }
  }

  try {
    if (!client) {
      throw new Error('Client not initialized')
    }
    await client.sendMessage(`${phoneNumber}@c.us`, message)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 })
  }
}

export async function GET() {
  await initializeClient()

  if (isClientAuthenticated) {
    return NextResponse.json({ authenticated: true })
  }

  if (lastQrCode) {
    return NextResponse.json({ authenticated: false, qrCode: lastQrCode })
  } else {
    try {
      const qrCode = await waitForQrCode()
      return NextResponse.json({ authenticated: false, qrCode })
    } catch (error) {
      return NextResponse.json({ authenticated: false, error: 'Failed to generate QR code' }, { status: 500 })
    }
  }
}

function waitForQrCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (lastQrCode) {
      resolve(lastQrCode)
    } else {
      const timeout = setTimeout(() => {
        reject(new Error('QR code timeout'))
      }, 60000) // 60 seconds

      const qrHandler = async (qr: string) => {
        lastQrCode = await qrcode.toDataURL(qr)
        if (client) {
          client.removeListener('qr', qrHandler)
        }
        clearTimeout(timeout)
        resolve(lastQrCode)
      }

      if (client) {
        client.on('qr', qrHandler)
      } else {
        reject(new Error('Client is not initialized'))
      }
    }
  })
}
