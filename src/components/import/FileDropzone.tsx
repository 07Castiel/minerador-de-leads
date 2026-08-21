import { useRef, useState, type DragEvent } from "react"
import { UploadIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type FileDropzoneProps = {
  onFileSelected: (file: File) => void
}

export function FileDropzone({ onFileSelected }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFileSelected(file)
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-12 text-center transition-colors",
        isDragging ? "border-primary bg-accent" : "border-input"
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <UploadIcon className="size-8 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">Arraste um arquivo CSV ou JSON aqui</p>
        <p className="text-sm text-muted-foreground">ou clique para escolher um arquivo</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileSelected(file)
          e.target.value = ""
        }}
      />
    </div>
  )
}
