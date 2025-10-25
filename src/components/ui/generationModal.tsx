"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Copy, ThumbsUp, ThumbsDown } from "lucide-react"
import type { ImageMeta } from "@/app/api"
import { useToast } from "@/usecases/useToast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/contexts/AuthContext"
import type { GenerationDialogProps } from "@/types/types"

export function GenerationDialog({ open, onOpenChange, image }: GenerationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isContributing, setIsContributing] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  if (!image) return null

  const handleDownload = async () => {
    setIsSubmitting(true)
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
      const fileName = `generated-image-${timestamp}.png`

      const downloadUrl = `/api/download?url=${encodeURIComponent(image.url)}&filename=${encodeURIComponent(fileName)}`

      const response = await fetch(downloadUrl)
      if (!response.ok) {
        throw new Error('ダウンロードに失敗しました')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      link.style.display = 'none'

      document.body.appendChild(link)
      link.click()

      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }, 100)

      toast({
        title: "ダウンロード完了",
        description: "画像のダウンロードが完了しました",
        variant: "success",
      })

      onOpenChange(false)
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: "エラー",
        description: "ダウンロードに失敗しました。",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(image.prompt || "")
      toast({ title: "コピーしました", description: "プロンプトをクリップボードにコピーしました", variant: "success" })
    } catch (e) {
      toast({ title: "コピーに失敗", description: "クリップボードへのアクセスに失敗しました", variant: "destructive" })
    }
  }

  const handleFeedback = (type: "up" | "down") => {
    toast({ title: "フィードバックありがとうございます", description: type === "up" ? "良いプロンプトとして記録しました" : "改善が必要として記録しました" })
  }

  const handlePost = async () => {
    setIsContributing(true)
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
      const fileName = `generated-image-${timestamp}.png`
      const downloadUrl = `/api/download?url=${encodeURIComponent(image.url)}&filename=${encodeURIComponent(fileName)}`

      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = fileName
      link.style.display = 'none'

      document.body.appendChild(link)
      link.click()

      setTimeout(() => {
        document.body.removeChild(link)
      }, 100)

      const response = await fetch('/api/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: image.url,
          prompt: image.prompt,
          profileId: user?.id || null,
        }),
      })

      if (response.ok) {
        toast({
          title: "完了しました",
          description: "画像をダウンロードし、共有データベースに追加されました",
        })
        onOpenChange(false)
      } else {
        const errorData = await response.json()
        toast({
          title: "エラーが発生しました",
          description: errorData.error || "画像の投稿に失敗しました",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('投稿エラー:', error)
      toast({
        title: "エラーが発生しました",
        description: "画像の投稿中にエラーが発生しました",
        variant: "destructive",
      })
    } finally {
      setIsContributing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>生成完了</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="aspect-video relative bg-muted rounded-lg overflow-hidden">
            <img 
              src={image.url || "/placeholder.svg"} 
              alt="Generated" 
              className="w-full h-full object-contain" 
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-medium">生成プロンプト</div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" aria-label="コピー" onClick={handleCopyPrompt}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="良い" onClick={() => handleFeedback("up")}>
                  <ThumbsUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="良くない" onClick={() => handleFeedback("down")}>
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="max-h-[80vh] overflow-auto p-3 border rounded-md bg-muted/30">
              <p className="text-sm whitespace-pre-wrap break-words">{image.prompt}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button onClick={handleDownload} disabled={isSubmitting}>
            <Download className="h-4 w-4 mr-2" />
            ダウンロードのみ
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handlePost}
                  disabled={isContributing}
                  variant="outline"
                >
                  ダウンロードして投稿
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                投稿すると他のユーザーがあなたが生成した画像を利用できるようになります
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
