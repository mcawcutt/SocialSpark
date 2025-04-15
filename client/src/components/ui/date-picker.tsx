import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  showTimePicker?: boolean;
}

export function DatePicker({ date, setDate, showTimePicker = false }: DatePickerProps) {
  const [selectedHour, setSelectedHour] = React.useState<string>(
    date ? format(date, "HH") : "12"
  );
  const [selectedMinute, setSelectedMinute] = React.useState<string>(
    date ? format(date, "mm") : "00"
  );
  
  // Update the time whenever hour or minute changes
  React.useEffect(() => {
    if (date && showTimePicker) {
      const newDate = new Date(date);
      newDate.setHours(parseInt(selectedHour, 10));
      newDate.setMinutes(parseInt(selectedMinute, 10));
      setDate(newDate);
    }
  }, [selectedHour, selectedMinute, showTimePicker]);

  // Generate hour options (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, "0");
    return {
      value: hour,
      label: showTimePicker && hour === "12" ? "12 PM" : 
             showTimePicker && parseInt(hour, 10) > 12 ? `${parseInt(hour, 10) - 12} PM` : 
             showTimePicker && hour === "00" ? "12 AM" : 
             showTimePicker ? `${parseInt(hour, 10)} AM` : hour
    };
  });

  // Generate minute options (0-59, intervals of 5)
  const minutes = Array.from({ length: 12 }, (_, i) => {
    const minute = (i * 5).toString().padStart(2, "0");
    return { value: minute, label: minute };
  });

  // Set the time when a new date is selected
  const handleCalendarSelect = (newDate: Date | undefined) => {
    if (newDate && date) {
      // Preserve the current time when selecting a new date
      newDate.setHours(date.getHours());
      newDate.setMinutes(date.getMinutes());
    } else if (newDate && showTimePicker) {
      // Set default time for a new date
      newDate.setHours(parseInt(selectedHour, 10));
      newDate.setMinutes(parseInt(selectedMinute, 10));
    }
    setDate(newDate);
  };

  return (
    <div className="flex flex-col gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleCalendarSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {showTimePicker && date && (
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
            <Select
              value={selectedHour}
              onValueChange={setSelectedHour}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue placeholder="Hour" />
              </SelectTrigger>
              <SelectContent>
                {hours.map((hour) => (
                  <SelectItem key={hour.value} value={hour.value}>
                    {hour.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="text-center text-muted-foreground">:</span>

          <Select
            value={selectedMinute}
            onValueChange={setSelectedMinute}
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue placeholder="Minute" />
            </SelectTrigger>
            <SelectContent>
              {minutes.map((minute) => (
                <SelectItem key={minute.value} value={minute.value}>
                  {minute.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}