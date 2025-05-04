import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

interface AnnouncementCardProps {
  announcement: any
}

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{announcement.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {announcement.description}
        </p>
        <div className="flex justify-between items-center text-sm">
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