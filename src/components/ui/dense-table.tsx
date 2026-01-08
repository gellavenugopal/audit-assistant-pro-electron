import * as React from "react"
import { cn } from "@/lib/utils"

interface DenseTableProps extends React.HTMLAttributes<HTMLDivElement> {
  maxHeight?: string
  stickyHeader?: boolean
}

const DenseTableContainer = React.forwardRef<HTMLDivElement, DenseTableProps>(
  ({ className, maxHeight = "calc(100vh - 280px)", stickyHeader = true, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative w-full border rounded-md",
        className
      )}
      {...props}
    >
      <div 
        className="overflow-auto" 
        style={{ maxHeight, display: "flex", flexDirection: "column" }}
      >
        <div className="min-w-full inline-block align-middle">
          <div className="overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
)
DenseTableContainer.displayName = "DenseTableContainer"

const DenseTable = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <table
    ref={ref}
    className={cn("w-full caption-bottom text-xs", className)}
    {...props}
  />
))
DenseTable.displayName = "DenseTable"

const DenseTableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> & { sticky?: boolean }
>(({ className, sticky = true, ...props }, ref) => (
  <thead 
    ref={ref} 
    className={cn(
      "bg-muted/80 backdrop-blur-sm",
      sticky && "sticky top-0 z-10",
      className
    )}
    {...props} 
  />
))
DenseTableHeader.displayName = "DenseTableHeader"

const DenseTableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
DenseTableBody.displayName = "DenseTableBody"

const DenseTableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0 sticky bottom-0 z-10",
      className
    )}
    {...props}
  />
))
DenseTableFooter.displayName = "DenseTableFooter"

const DenseTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }
>(({ className, selected, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted h-7",
      selected && "bg-muted",
      className
    )}
    {...props}
  />
))
DenseTableRow.displayName = "DenseTableRow"

const DenseTableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-8 px-2 py-1 text-left align-middle font-semibold text-muted-foreground [&:has([role=checkbox])]:pr-0 whitespace-nowrap",
      className
    )}
    {...props}
  />
))
DenseTableHead.displayName = "DenseTableHead"

const DenseTableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-2 py-0.5 align-middle [&:has([role=checkbox])]:pr-0 whitespace-nowrap overflow-hidden text-ellipsis",
      className
    )}
    {...props}
  />
))
DenseTableCell.displayName = "DenseTableCell"

const DenseTableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-2 text-xs text-muted-foreground", className)}
    {...props}
  />
))
DenseTableCaption.displayName = "DenseTableCaption"

export {
  DenseTable,
  DenseTableContainer,
  DenseTableHeader,
  DenseTableBody,
  DenseTableFooter,
  DenseTableHead,
  DenseTableRow,
  DenseTableCell,
  DenseTableCaption,
}
