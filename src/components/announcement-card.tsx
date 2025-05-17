import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import CountdownTimer from "./CountdownTimer"
import { useSession } from "next-auth/react"

interface AnnouncementCardProps {
  announcement: {
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
    createdAt: string;
    price: number;
    minBidPrice: number | null;
    currentUserBidPrice: number | null;
    user: {
      firstName: string;
      lastName: string;
    };
  }
}

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const { data: session } = useSession();

  let displayPrice = announcement.price;
  if (announcement.minBidPrice !== null) {
    displayPrice = announcement.minBidPrice;
  }
  if (session?.user?.role === 'MASTER' && announcement.currentUserBidPrice !== null) {
    displayPrice = announcement.currentUserBidPrice;
  }

  return (
    <Card className="overflow-hidden dark:bg-background flex flex-col h-full">
      <div className="relative h-48 w-full">
        <img
          src={announcement.imageUrl || '/placeholder.jpg'}
          alt={announcement.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg leading-tight truncate">{announcement.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between pt-2">
        <div>
          <p className="text-xs text-muted-foreground mb-2 truncate">
            {announcement.description}
          </p>
          {session?.user?.role === 'MASTER' && (
            <div className="text-xs mb-2">
              {announcement.currentUserBidPrice !== null ? (
                announcement.minBidPrice !== null && announcement.currentUserBidPrice <= announcement.minBidPrice ? (
                  <span className="text-green-600 font-semibold">
                    Ваша ставка {announcement.currentUserBidPrice} ₽ лидирует!
                  </span>
                ) : (
                  <span className="text-red-600 font-semibold">
                    Ваша ставка {announcement.currentUserBidPrice} ₽ выше минимальной ({announcement.minBidPrice} ₽)
                  </span>
                )
              ) : (
                announcement.minBidPrice !== null ? (
                  <span className="text-gray-500">
                    Минимальная ставка: {announcement.minBidPrice} ₽. Вы не ставили.
                  </span>
                ) : (
                  <span className="text-gray-500">Ставок пока нет.</span>
                )
              )}
            </div>
          )}
          {announcement.createdAt && (
            <div className="text-xs text-gray-700 dark:text-gray-400 mb-2">
              <CountdownTimer createdAt={new Date(announcement.createdAt)} />
            </div>
          )}
        </div>
        <div className="flex justify-between items-center text-sm mt-auto">
          <span className="font-semibold text-base">{displayPrice} ₽</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(announcement.createdAt), "d MMM yy", { locale: ru })}
          </span>
        </div>
      </CardContent>
    </Card>
  )
} 