import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Получение профиля пользователя
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;
    console.log('API: Fetching user with ID:', userId);

    // Получаем все поля пользователя, включая баланс, кроме пароля
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    console.log('API: Found user:', user);
    // Удаляем пароль перед отправкой
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user;
    return NextResponse.json(safeUser);
  } catch (error) {
    console.error('API: Error fetching user:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении данных пользователя' },
      { status: 500 }
    );
  }
}

// Обновление профиля пользователя
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const body = await request.json();

    const user = await prisma.user.update({
      where: { id: userId },
      data: body,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: pwd, ...updatedSafeUser } = user;
    return NextResponse.json(updatedSafeUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении данных пользователя' },
      { status: 500 }
    );
  }
} 