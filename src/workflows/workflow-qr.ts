/**
 * This workflow is a proof of concept that scans a QR code image and 
 * generates/signs an ethereum attestation
 */

import { Jimp } from 'jimp'
import jsQR from 'jsqr'

/**
 * Read an image from disk and decodes QR code
 * 
 * @param {string} imagePath - The path to the image file
 * @returns {Promise<string>} - The decoded QR code data
 * @throws {Error} - If the image cannot be read or the QR code cannot be decoded
 */
async function decodeQR(imagePath: string): Promise<string> {
  try {
    // Read image
    const image = await Jimp.read(imagePath)

    // Convert image Buffer to Uint8ClampedArray
    const clamped = new Uint8ClampedArray(image.bitmap.data.buffer)
    
    // Convert the image to a pixel array
    const { data, width, height } = image.bitmap

    // Decode the QR code
    const code = jsQR(clamped, width, height)
    if (!code) {
      throw new Error('QR code not found')
    }

    return code.data
  } catch (error: any) {
    throw new Error(`Failed to decode QR code: ${error.message}`)
  }
}

async function main() {
  const imagePath = 'src/assets/qrcode.png'

  try {
    const qrData = await decodeQR(imagePath)
    console.log('Decoded QR code data:', qrData)
  } catch (error) {
    console.error(error)
  }
}

main()