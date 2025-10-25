import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')
    const fileName = searchParams.get('filename')
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 })
    }

    const response = await fetch(imageUrl)
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status })
    }

    const imageBuffer = await response.arrayBuffer()
    
    // ファイル名を決定（パラメータで指定されたもの、またはURLから抽出）
    let finalFileName = fileName
    if (!finalFileName) {
      const urlParts = imageUrl.split('/')
      const urlFileName = urlParts[urlParts.length - 1].split('?')[0]
      finalFileName = urlFileName && urlFileName.includes('.') ? urlFileName : 'generated-image.png'
    }
    
    // Content-Typeを決定
    let contentType = 'image/png'
    if (finalFileName.toLowerCase().endsWith('.jpg') || finalFileName.toLowerCase().endsWith('.jpeg')) {
      contentType = 'image/jpeg'
    } else if (finalFileName.toLowerCase().endsWith('.gif')) {
      contentType = 'image/gif'
    } else if (finalFileName.toLowerCase().endsWith('.webp')) {
      contentType = 'image/webp'
    }
    
    // 日本語ファイル名を正しくエンコード
    const encodedFileName = encodeURIComponent(finalFileName)
    
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedFileName}`,
        'Content-Length': imageBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
