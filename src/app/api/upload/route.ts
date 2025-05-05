import { NextResponse } from 'next/server';
import { Readable } from 'stream';
import cloudinary from '@/lib/cloudinary';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Файл не найден' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload file to Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'kargner' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      Readable.from(buffer).pipe(uploadStream);
    });
    const imageUrl = result.secure_url;
    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке файла' },
      { status: 500 }
    );
  }
} 