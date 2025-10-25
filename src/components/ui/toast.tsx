import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Toast } from "@/hooks/use-toast"

interface ToastProps {
  toast: Toast
  onDismiss: (id: string) => void
}

export function ToastComponent({ toast, onDismiss }: ToastProps) {
  return (
    <div
      className={cn(
        "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
        toast.variant === "destructive"
          ? "border-red-500 bg-red-500 text-white"
          : toast.variant === "success"
          ? "border-green-500 bg-green-500 text-white"
          : "border bg-background text-foreground"
      )}
    >
      <div className="grid gap-1">
        {toast.title && (
          <div className="text-sm font-semibold">{toast.title}</div>
        )}
        {toast.description && (
          <div className="text-sm opacity-90">{toast.description}</div>
        )}
      </div>
      <button
        className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
        onClick={() => onDismiss(toast.id)}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function Toaster({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
