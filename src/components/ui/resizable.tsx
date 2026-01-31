"use client"

import { GripHorizontal, GripVertical } from "lucide-react"
import {
  Panel,
  Group,
  Separator,
} from "react-resizable-panels"

import { cn } from "@/lib/utils"

type ResizablePanelGroupProps = Omit<React.ComponentProps<typeof Group>, 'orientation'> & {
  direction?: "horizontal" | "vertical"
}

const ResizablePanelGroup = ({
  className,
  direction = "horizontal",
  ...props
}: ResizablePanelGroupProps) => (
  <Group
    orientation={direction}
    className={cn(
      "flex h-full w-full",
      direction === "vertical" && "flex-col",
      className
    )}
    {...props}
  />
)

const ResizablePanel = Panel

const ResizableHandle = ({
  withHandle,
  className,
  direction = "vertical",
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean
  direction?: "horizontal" | "vertical"
}) => (
  <Separator
    className={cn(
      "relative flex items-center justify-center bg-neutral-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
      direction === "vertical"
        ? "h-1 w-full cursor-row-resize"
        : "w-1 h-full cursor-col-resize",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className={cn(
        "z-10 flex items-center justify-center rounded-sm border bg-border",
        direction === "vertical" ? "h-4 w-3" : "h-3 w-4"
      )}>
        {direction === "vertical" ? (
          <GripHorizontal className="h-2.5 w-2.5" />
        ) : (
          <GripVertical className="h-2.5 w-2.5" />
        )}
      </div>
    )}
  </Separator>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
