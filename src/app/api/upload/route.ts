export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }
    // Read file into buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    // Generate unique filename
    const fileName = `${Date.now()}_${file.name}`;
    // Upload using Supabase Admin client
    const { data, error } = await supabaseAdmin
      .storage
      .from('images')
      .upload(fileName, buffer, { cacheControl: '3600', upsert: false });
    if (error || !data) {
      console.error('Supabase admin upload error:', error);
      return NextResponse.json({ error: error?.message || 'Ошибка при загрузке файла' }, { status: 500 });
    }
    // Get public URL for the uploaded file
    const {
      data: { publicUrl }
    } = supabaseAdmin.storage.from('images').getPublicUrl(data.path);
    return NextResponse.json({ imageUrl: publicUrl });
  } catch (err) {
    console.error('Error in upload route:', err);
    return NextResponse.json({ error: 'Ошибка сервера при загрузке файла' }, { status: 500 });
  }
} 