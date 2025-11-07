"use client"

import * as React from "react"
import { cn } from "@/libs/utils"

type TabsContextValue = {
  value: string
  setValue: (v: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

export function Tabs({ value, defaultValue, onValueChange, className, children, ...props }: TabsProps) {
  const [internal, setInternal] = React.useState<string>(defaultValue || "")
  const current = value ?? internal

  const setValue = React.useCallback(
    (v: string) => {
      if (onValueChange) onValueChange(v)
      if (value === undefined) setInternal(v)
    },
    [onValueChange, value]
  )

  React.useEffect(() => {
    if (!current && defaultValue) setInternal(defaultValue)
  }, [current, defaultValue])

  return (
    <TabsContext.Provider value={{ value: current, setValue }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center justify-center rounded-lg p-1 text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

export function TabsTrigger({ value, className, children, ...props }: TabsTriggerProps) {
  const ctx = React.useContext(TabsContext)
  if (!ctx) throw new Error("TabsTrigger must be used within Tabs")
  const selected = ctx.value === value
  return (
    <button
      role="tab"
      aria-selected={selected}
      data-state={selected ? "active" : "inactive"}
      onClick={() => ctx.setValue(value)}
      className={cn(
        "px-3 py-2 text-sm rounded-md transition-colors",
        selected ? "bg-primary text-primary-foreground" : "hover:bg-muted",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const ctx = React.useContext(TabsContext)
  if (!ctx) throw new Error("TabsContent must be used within Tabs")
  if (ctx.value !== value) return null
  return (
    <div role="tabpanel" className={cn("rounded-lg", className)} {...props}>
      {children}
    </div>
  )
}

