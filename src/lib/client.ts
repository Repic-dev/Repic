export interface ContributeImageRequest {
  image_id: string
  license: "CC0" | "CC BY 4.0"
  attribution?: string
}

export async function contributeImage(data: ContributeImageRequest): Promise<void> {
  const response = await fetch('/api/contribute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to contribute image')
  }
}
