import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-4">Админ-панель</h1>
      <p>Добро пожаловать, администратор!</p>
      {/* Здесь будет функционал управления пользователями, объявлениями и т.д. */}
    </main>
  );
} 