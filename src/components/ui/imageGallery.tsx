'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Heart, Download, Maximize2, X, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/libs/supabase';

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  likes: number;
  createdAt: string;
}

export function ImageGallery() {
  const { user } = useAuth();
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(
    null
  );
  const [likedImages, setLikedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('images')
          .select('id, image_url, prompt, created_at')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('画像取得エラー:', error);
          setImages([]);
        } else if (data) {
          const formattedImages: GeneratedImage[] = data.map((img) => ({
            id: img.id,
            url: img.image_url,
            prompt: img.prompt,
            likes: 0, // いいね機能は後で実装可能
            createdAt: img.created_at,
          }));
          setImages(formattedImages);
        }
      } catch (error) {
        console.error('画像取得エラー:', error);
        setImages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [user]);

  const toggleLike = (id: string) => {
    setLikedImages((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDownload = async (imageUrl: string, prompt: string) => {
    try {
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:-]/g, '');
      const fileName = `generated-image-${timestamp}.png`;
      const downloadUrl = `/api/download?url=${encodeURIComponent(
        imageUrl
      )}&filename=${encodeURIComponent(fileName)}`;

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('ダウンロードに失敗しました');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('ダウンロードエラー:', error);
      alert('ダウンロードに失敗しました');
    }
  };

  if (loading) {
    return (
      <div className='text-center py-16 text-muted-foreground'>
        読み込み中...
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className='text-center py-16 text-muted-foreground'>
        作品がまだありません
      </div>
    );
  }

  return (
    <>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
        {images.map((image) => (
          <Card
            key={image.id}
            onClick={() => setSelectedImage(image)}
            className='group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/50'
          >
            <div className='aspect-square relative overflow-hidden'>
              <img
                src={image.url || '/placeholder.svg'}
                alt={image.prompt}
                className='w-full h-full object-cover transition-transform duration-300 group-hover:scale-110'
              />

              <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
                <div className='absolute bottom-0 left-0 right-0 p-4 space-y-3'>
                  <p className='text-sm text-white line-clamp-2 leading-relaxed'>
                    {image.prompt}
                  </p>

                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-2'>
                      <Button
                        size='sm'
                        variant='ghost'
                        className={`h-8 px-3 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                          likedImages.has(image.id)
                            ? 'text-accent hover:text-accent'
                            : 'text-white hover:text-accent'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(image.id);
                        }}
                        aria-label={
                          likedImages.has(image.id)
                            ? 'いいねを取り消す'
                            : 'いいねする'
                        }
                      >
                        <Heart
                          className={`h-4 w-4 mr-1 ${
                            likedImages.has(image.id) ? 'fill-current' : ''
                          }`}
                        />
                        <span className='text-xs'>
                          {image.likes + (likedImages.has(image.id) ? 1 : 0)}
                        </span>
                      </Button>

                      <Button
                        size='sm'
                        variant='ghost'
                        className='h-8 px-3 text-white hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(image.url, image.prompt);
                        }}
                        aria-label='画像をダウンロード'
                      >
                        <Download className='h-4 w-4' />
                      </Button>
                    </div>

                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-8 px-3 text-white hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(image);
                      }}
                      aria-label='画像を拡大表示'
                    >
                      <Maximize2 className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <ImageModal
        image={selectedImage}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        isLiked={selectedImage ? likedImages.has(selectedImage.id) : false}
        onToggleLike={() => selectedImage && toggleLike(selectedImage.id)}
        onDownload={handleDownload}
      />
    </>
  );
}

interface ImageModalProps {
  image: GeneratedImage | null;
  isOpen: boolean;
  onClose: () => void;
  isLiked: boolean;
  onToggleLike: () => void;
  onDownload: (imageUrl: string, prompt: string) => void;
}

function ImageModal({
  image,
  isOpen,
  onClose,
  isLiked,
  onToggleLike,
  onDownload,
}: ImageModalProps) {
  if (!image) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-card border-border'>
        <div className='grid md:grid-cols-[1fr,360px] gap-0'>
          <div className='relative bg-black flex items-center justify-center min-h-[240px] md:min-h-[400px]'>
            <img
              src={image.url || '/placeholder.svg'}
              alt={image.prompt}
              className='max-h-[70vh] w-auto h-auto object-contain'
            />
          </div>

          <div className='p-6 space-y-6'>
            <div className='flex items-start justify-between'>
              <DialogTitle className='text-lg font-semibold text-balance leading-relaxed'>
                詳細
              </DialogTitle>
              <Button
                variant='ghost'
                size='icon'
                onClick={onClose}
                className='h-8 w-8 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                aria-label='閉じる'
              >
                <X className='h-4 w-4' />
              </Button>
            </div>

            <div className='space-y-4'>
              <div>
                <label className='text-sm font-medium text-muted-foreground'>
                  プロンプト
                </label>
                <p className='mt-2 text-sm leading-relaxed'>{image.prompt}</p>
              </div>

              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <Calendar className='h-4 w-4' />
                <span>
                  {new Date(image.createdAt).toLocaleDateString('ja-JP')}
                </span>
              </div>

              <div className='flex items-center gap-2'>
                <Button
                  variant={isLiked ? 'default' : 'outline'}
                  className='flex-1'
                  onClick={onToggleLike}
                  aria-label={isLiked ? 'いいねを取り消す' : 'いいねする'}
                >
                  <Heart
                    className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current' : ''}`}
                  />
                  {isLiked ? 'いいね済み' : 'いいね'}
                  <span className='ml-2'>
                    ({image.likes + (isLiked ? 1 : 0)})
                  </span>
                </Button>
                <Button
                  variant='outline'
                  className='flex-1 bg-transparent'
                  aria-label='画像をダウンロード'
                  onClick={() => onDownload(image.url, image.prompt)}
                >
                  <Download className='h-4 w-4 mr-2' />
                  ダウンロード
                </Button>
              </div>
            </div>

            <div className='pt-4 border-t border-border space-y-3'>
              <h4 className='text-sm font-medium'>生成情報</h4>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>モデル</span>
                  <span>DALL-E 3</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>サイズ</span>
                  <span>1024 × 1024</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>スタイル</span>
                  <span>Vivid</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
