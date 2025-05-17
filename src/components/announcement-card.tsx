import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import CountdownTimer from "./CountdownTimer"

interface AnnouncementCardProps {
  announcement: {
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
    createdAt: string;
    price: number;
  }
}

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="relative h-48 w-full">
        <img
          src={announcement.imageUrl || '/placeholder.jpg'}
          alt={announcement.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      <CardHeader>
        <CardTitle>{announcement.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {announcement.description}
        </p>
        <div className="mt-2">
          <CountdownTimer createdAt={new Date(announcement.createdAt)} />
        </div>
        <div className="flex justify-between items-center text-sm mt-2">
          <span className="font-medium">{announcement.price} ₽</span>
          <span className="text-muted-foreground">
            {format(new Date(announcement.createdAt), "d MMMM yyyy", {
              locale: ru,
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  )
} 