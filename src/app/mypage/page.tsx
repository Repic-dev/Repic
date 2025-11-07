"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImageGallery } from "@/components/image-gallery"
import { Heart, Eye } from "lucide-react"
import Image from "next/image"

export default function UserProfile() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Logo (same as top page) */}
      <div className="w-full py-6 flex justify-start">
        <Image src="/repicLogo.png" alt="Repic" width={150} height={40} className="object-contain" />
      </div>

      {/* Profile Section */}
      <div className="max-w-6xl mx-auto py-8">
        <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
          <Avatar className="h-24 w-24 md:h-32 md:w-32 border-2 border-primary/20">
            <AvatarImage src="/diverse-user-avatars.png" />
            <AvatarFallback className="text-2xl bg-primary/10 text-primary">AI</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 text-balance">AI Artist</h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {"Creating stunning AI-generated artwork. Exploring the intersection of technology and creativity."}
              </p>
            </div>

            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">{"124 作品"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-accent" />
                <span className="text-muted-foreground">{"2.4K いいね"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{"15.2K 閲覧"}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button className="bg-primary hover:bg-primary/90">{"フォロー"}</Button>
              <Button variant="outline">{"メッセージ"}</Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="gallery" className="w-full">
          <TabsList className="w-full md:w-auto mb-8 bg-card border border-border">
            <TabsTrigger value="gallery" className="flex-1 md:flex-none">
              {"ギャラリー"}
            </TabsTrigger>
            <TabsTrigger value="liked" className="flex-1 md:flex-none">
              {"いいね"}
            </TabsTrigger>
            <TabsTrigger value="collections" className="flex-1 md:flex-none">
              {"コレクション"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="mt-0">
            <ImageGallery />
          </TabsContent>

          <TabsContent value="liked" className="mt-0">
            <div className="text-center py-16 text-muted-foreground">{"いいねした作品がここに表示されます"}</div>
          </TabsContent>

          <TabsContent value="collections" className="mt-0">
            <div className="text-center py-16 text-muted-foreground">{"コレクションがここに表示されます"}</div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
