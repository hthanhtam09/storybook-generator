"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, X, ImageIcon, AlertCircle, CheckCircle2 } from "lucide-react"
import type { ImageFile } from "@/lib/types"

interface ImageUploadProps {
  storyCount: number
  images?: ImageFile[]
  onImagesChange?: (images: ImageFile[]) => void
}

export function ImageUpload({ storyCount, images: initialImages = [], onImagesChange }: ImageUploadProps) {
  const [images, setImages] = useState<ImageFile[]>(initialImages)
  const [dragActive, setDragActive] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    setImages(initialImages)
  }, [initialImages])

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const newErrors: string[] = []
      const newImages: ImageFile[] = []

      Array.from(files).forEach((file) => {
        // Validate file type
        if (!file.type.match(/^image\/(png|jpe?g)$/)) {
          newErrors.push(`${file.name}: Only PNG and JPG files are supported`)
          return
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          newErrors.push(`${file.name}: File size must be less than 5MB`)
          return
        }

        // Extract number from filename (e.g., "1.png" -> 1)
        const numberMatch = file.name.match(/^(\d+)\.(png|jpe?g)$/i)
        if (!numberMatch) {
          newErrors.push(`${file.name}: Filename must be in format: 1.png, 2.jpg, etc.`)
          return
        }

        const imageNumber = Number.parseInt(numberMatch[1], 10)

        // Create preview URL
        const preview = URL.createObjectURL(file)

        newImages.push({
          number: imageNumber,
          file,
          preview,
          name: file.name,
        })
      })

      // Update images, replacing any with the same number
      setImages((prev) => {
        // Revoke old preview URLs to prevent memory leaks
        const updatedImages = [...prev]
        newImages.forEach((newImg) => {
          const existingIndex = updatedImages.findIndex((img) => img.number === newImg.number)
          if (existingIndex !== -1) {
            URL.revokeObjectURL(updatedImages[existingIndex].preview)
            updatedImages[existingIndex] = newImg
          } else {
            updatedImages.push(newImg)
          }
        })
        return updatedImages.sort((a, b) => a.number - b.number)
      })

      setErrors(newErrors)

      if (onImagesChange) {
        onImagesChange([...images, ...newImages].sort((a, b) => a.number - b.number))
      }
    },
    [images, onImagesChange],
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files)
      }
    },
    [processFiles],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files)
      }
    },
    [processFiles],
  )

  const removeImage = useCallback(
    (number: number) => {
      setImages((prev) => {
        const updated = prev.filter((img) => {
          if (img.number === number) {
            URL.revokeObjectURL(img.preview)
            return false
          }
          return true
        })

        if (onImagesChange) {
          onImagesChange(updated)
        }

        return updated
      })
    },
    [onImagesChange],
  )

  const missingImages =
    storyCount > 0
      ? Array.from({ length: storyCount }, (_, i) => i + 1).filter((num) => !images.find((img) => img.number === num))
      : []

  const extraImages = images.filter((img) => img.number > storyCount)

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Image Upload</h3>
          <p className="text-xs text-muted-foreground">Upload images named 1.png, 2.png, etc.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <ImageIcon className="h-3 w-3" />
            {images.length} / {storyCount} images
          </Badge>
          {images.length === storyCount && storyCount > 0 && missingImages.length === 0 && (
            <Badge variant="outline" className="gap-1 border-green-500/50 text-green-500">
              <CheckCircle2 className="h-3 w-3" />
              Complete
            </Badge>
          )}
        </div>
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <div className="space-y-1">
              {errors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {missingImages.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Missing images for stories: {missingImages.join(", ")}
          </AlertDescription>
        </Alert>
      )}

      {extraImages.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Extra images found: {extraImages.map((img) => img.name).join(", ")} (no matching stories)
          </AlertDescription>
        </Alert>
      )}

      <Card
        className={`flex-1 p-4 transition-colors ${dragActive ? "border-primary bg-primary/5" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {images.length === 0 ? (
          <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Drag and drop images here</p>
              <p className="mt-1 text-xs text-muted-foreground">or click to browse</p>
              <p className="mt-2 text-xs text-muted-foreground">PNG or JPG, max 5MB per file</p>
            </div>
            <input type="file" className="hidden" accept="image/png,image/jpeg" multiple onChange={handleFileInput} />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {images.map((image) => (
                <div key={image.number} className="group relative">
                  <div className="aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                    <img
                      src={image.preview || "/placeholder.svg"}
                      alt={`Story ${image.number}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="absolute left-2 top-2">
                    <Badge variant="secondary" className="text-xs">
                      Story {image.number}
                    </Badge>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute right-2 top-2 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => removeImage(image.number)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <div className="mt-1 truncate text-xs text-muted-foreground">{image.name}</div>
                </div>
              ))}
            </div>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 p-4 transition-colors hover:border-primary hover:bg-primary/5">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Add more images</span>
              <input type="file" className="hidden" accept="image/png,image/jpeg" multiple onChange={handleFileInput} />
            </label>
          </div>
        )}
      </Card>
    </div>
  )
}
