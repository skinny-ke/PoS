"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "./utils";
import { buttonVariants } from "./button";

interface CalendarProps {
  className?: string;
  classNames?: any;
  showOutsideDays?: boolean;
  mode?: "single" | "range" | "multiple";
  selected?: any;
  onSelect?: any;
  disabled?: any;
  [key: string]: any;
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <div
      className={cn("p-3", className)}
      {...props}
    >
      <div className="text-muted-foreground text-center py-4">
        Calendar component (react-day-picker not installed)
      </div>
    </div>
  );
}

export { Calendar };
