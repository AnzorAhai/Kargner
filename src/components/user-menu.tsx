import { signIn, signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { User } from "lucide-react"

export function UserMenu() {
  const { data: session } = useSession()

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">{session.user?.name}</span>
        <Button variant="ghost" size="sm" onClick={() => signOut()}>
          Выйти
        </Button>
      </div>
    )
  }

  return (
    <Button variant="ghost" size="sm" onClick={() => signIn()}>
      <User className="mr-2 h-4 w-4" />
      Войти
    </Button>
  )
} 