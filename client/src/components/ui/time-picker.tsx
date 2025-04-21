import * as React from "react"
import { Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TimePickerProps {
  time: Date | undefined
  setTime: (time: Date | undefined) => void
  disabled?: boolean
}

export function TimePicker({ time, setTime, disabled }: TimePickerProps) {
  // Generate options for hours (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i)
  
  // Generate options for minutes (0-59)
  const minutes = Array.from({ length: 60 }, (_, i) => i)
  
  // Format time for display
  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }
  
  // Update the time with new hours
  const handleHourChange = (hour: string) => {
    const newDate = new Date(time || new Date())
    newDate.setHours(parseInt(hour))
    setTime(newDate)
  }
  
  // Update the time with new minutes
  const handleMinuteChange = (minute: string) => {
    const newDate = new Date(time || new Date())
    newDate.setMinutes(parseInt(minute))
    setTime(newDate)
  }
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !time && "text-muted-foreground",
            disabled && "cursor-not-allowed opacity-50"
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {time ? formatTime(time) : <span>Set time</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4">
        <div className="flex gap-2 items-center justify-center">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Hour</label>
            <Select
              value={time ? time.getHours().toString() : undefined}
              onValueChange={handleHourChange}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Hour" />
              </SelectTrigger>
              <SelectContent>
                {hours.map((hour) => (
                  <SelectItem key={hour} value={hour.toString()}>
                    {hour.toString().padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end pb-1">
            <span className="text-xl">:</span>
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Minute</label>
            <Select
              value={time ? time.getMinutes().toString() : undefined}
              onValueChange={handleMinuteChange}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Minute" />
              </SelectTrigger>
              <SelectContent>
                {minutes.map((minute) => (
                  <SelectItem key={minute} value={minute.toString()}>
                    {minute.toString().padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}