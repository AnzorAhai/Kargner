"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export function CreateAnnouncementForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const price = Number(formData.get("price"))

    try {
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          price,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create announcement")
      }

      router.push("/announcements")
      router.refresh()
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="title">Заголовок</Label>
        <Input
          id="title"
          name="title"
          placeholder="Введите заголовок"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Введите описание"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="price">Цена</Label>
        <Input
          id="price"
          name="price"
          type="number"
          placeholder="Введите цену"
          required
        />
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Создание..." : "Создать объявление"}
      </Button>
    </form>
  )
} 