'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Heart, Download, Maximize2, X, Calendar } from 'lucide-react';

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  likes: number;
  createdAt: string;
}

const mockImages: GeneratedImage[] = [
  {
    id: '1',
    url: '/cyberpunk-city-neon.jpg',
    prompt: 'Cyberpunk city with neon lights at night',
    likes: 234,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    url: '/fantasy-forest-magical.jpg',
    prompt: 'Magical fantasy forest with glowing mushrooms',
    likes: 189,
    createdAt: '2024-01-14',
  },
  {
    id: '3',
    url: '/space-nebula-stars.png',
    prompt: 'Colorful nebula in deep space with stars',
    likes: 312,
    createdAt: '2024-01-13',
  },
  {
    id: '4',
    url: '/dragon-mountain-fantasy.jpg',
    prompt: 'Majestic dragon on mountain peak',
    likes: 445,
    createdAt: '2024-01-12',
  },
  {
    id: '5',
    url: '/underwater-coral-reef.png',
    prompt: 'Vibrant underwater coral reef scene',
    likes: 167,
    createdAt: '2024-01-11',
  },
  {
    id: '6',
    url: '/steampunk-airship.jpg',
    prompt: 'Steampunk airship flying through clouds',
    likes: 278,
    createdAt: '2024-01-10',
  },
  {
    id: '7',
    url: '/anime-girl-cherry-blossom.jpg',
    prompt: 'Anime style girl under cherry blossom tree',
    likes: 523,
    createdAt: '2024-01-09',
  },
  {
    id: '8',
    url: '/futuristic-robot.jpg',
    prompt: 'Futuristic humanoid robot portrait',
    likes: 391,
    createdAt: '2024-01-08',
  },
];

export function ImageGallery() {
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(
    null
  );
  const [likedImages, setLikedImages] = useState<Set<string>>(new Set());

  const toggleLike = (id: string) => {
    setLikedImages((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
        {mockImages.map((image) => (
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
}

function ImageModal({
  image,
  isOpen,
  onClose,
  isLiked,
  onToggleLike,
}: ImageModalProps) {
  if (!image) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-3xl max-h-[80vh] overflow-hidden p-0 gap-0 bg-card border-border'>
        <div className='grid md:grid-cols-[1fr,360px] gap-0'>
          <div className='relative bg-black flex items-center justify-center min-h-[240px] md:min-h-[400px] max-h-[60vh]'>
            <img
              src={image.url || '/placeholder.svg'}
              alt={image.prompt}
              className='max-h-[60vh] w-auto h-auto object-contain'
            />
          </div>

          <div className='p-6 space-y-6 overflow-y-auto max-h-[60vh]'>
            <div className='flex items-start justify-between'>
              <DialogTitle className='text-lg font-semibold text-balance leading-relaxed'>
                生成画像の詳細
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
