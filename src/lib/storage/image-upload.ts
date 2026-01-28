import { createClient } from "@/lib/supabase/client"

const BUCKET_NAME = "trip-covers"
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ImageUploadError"
  }
}

/**
 * Validates the file before upload
 */
function validateFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new ImageUploadError(
      "Invalid file type. Please upload a JPEG, PNG, or WebP image."
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new ImageUploadError(
      "File is too large. Maximum size is 5MB."
    )
  }
}

/**
 * Generates a unique filename for the upload
 */
function generateFileName(file: File, tripId: string): string {
  const extension = file.name.split(".").pop() || "jpg"
  const timestamp = Date.now()
  return `${tripId}/${timestamp}.${extension}`
}

/**
 * Uploads a trip cover image to Supabase Storage
 * @param file The image file to upload
 * @param tripId The trip ID (used for organizing files)
 * @returns The public URL of the uploaded image
 */
export async function uploadTripCoverImage(
  file: File,
  tripId: string
): Promise<string> {
  validateFile(file)

  const supabase = createClient()
  const fileName = generateFileName(file, tripId)

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    })

  if (uploadError) {
    console.error("Upload error:", uploadError)
    throw new ImageUploadError("Failed to upload image. Please try again.")
  }

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName)

  return publicUrl
}

/**
 * Deletes a trip cover image from Supabase Storage
 * @param url The public URL of the image to delete
 */
export async function deleteTripCoverImage(url: string): Promise<void> {
  const supabase = createClient()

  // Extract the file path from the URL
  // URL format: https://<project>.supabase.co/storage/v1/object/public/trip-covers/<path>
  const bucketPath = `/storage/v1/object/public/${BUCKET_NAME}/`
  const pathIndex = url.indexOf(bucketPath)

  if (pathIndex === -1) {
    // Not a Supabase storage URL, nothing to delete
    return
  }

  const filePath = url.substring(pathIndex + bucketPath.length)

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath])

  if (error) {
    console.error("Delete error:", error)
    // Don't throw - deletion failure shouldn't block other operations
  }
}
