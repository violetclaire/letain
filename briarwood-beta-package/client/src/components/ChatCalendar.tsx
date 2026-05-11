import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar, Check, X, Edit2 } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfDay } from "date-fns";

interface ChatCalendarProps {
  onDatesSelected: (dates: Date[]) => void;
  onCancel: () => void;
  initialDates?: Date[];
  multiSelect?: boolean;
  minDate?: Date;
  prompt?: string;
}

export default function ChatCalendar({
  onDatesSelected,
  onCancel,
  initialDates = [],
  multiSelect = true,
  minDate = new Date(),
  prompt = "Select a date"
}: ChatCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[]>(initialDates);
  const [isEditMode, setIsEditMode] = useState(false);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startDay = startOfMonth(currentMonth).getDay();
  const emptyDays = Array(startDay).fill(null);

  const handleDateClick = (date: Date) => {
    if (isBefore(startOfDay(date), startOfDay(minDate))) return;
    
    if (multiSelect) {
      const exists = selectedDates.some(d => isSameDay(d, date));
      if (exists) {
        setSelectedDates(prev => prev.filter(d => !isSameDay(d, date)));
      } else {
        setSelectedDates(prev => [...prev, date].sort((a, b) => a.getTime() - b.getTime()));
      }
    } else {
      setSelectedDates([date]);
    }
  };

  const handleConfirm = () => {
    if (selectedDates.length > 0) {
      onDatesSelected(selectedDates);
    }
  };

  const formatSelectedDates = () => {
    if (selectedDates.length === 0) return "No dates selected";
    if (selectedDates.length === 1) return format(selectedDates[0], "MMMM d, yyyy");
    return `${selectedDates.length} dates selected`;
  };

  return (
    <div className="bg-cream border border-pink/30 rounded-lg shadow-lg overflow-hidden max-w-[320px] w-full" data-testid="chat-calendar">
      <div className="bg-gradient-to-r from-pink/20 to-powder/30 px-4 py-3 border-b border-pink/20">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-pink" />
          <span className="text-sm font-header text-forest">{prompt}</span>
        </div>
      </div>

      <div className="p-3 bg-cream">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-pink/10 rounded-full transition-colors touch-manipulation"
            data-testid="button-prev-month"
          >
            <ChevronLeft size={20} className="text-forest" />
          </button>
          <span className="font-header text-forest text-sm">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-pink/10 rounded-full transition-colors touch-manipulation"
            data-testid="button-next-month"
          >
            <ChevronRight size={20} className="text-forest" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
            <div key={day} className="text-center text-[0.65rem] font-medium text-gold py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {days.map(day => {
            const isSelected = selectedDates.some(d => isSameDay(d, day));
            const isPast = isBefore(startOfDay(day), startOfDay(minDate));
            const isCurrentDay = isToday(day);
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDateClick(day)}
                disabled={isPast}
                className={`
                  aspect-square flex items-center justify-center text-sm rounded-full
                  transition-all duration-150 touch-manipulation
                  min-h-[40px] min-w-[40px]
                  ${isPast 
                    ? "text-gray-300 cursor-not-allowed" 
                    : isSelected
                      ? "bg-pink text-white font-medium shadow-md scale-105"
                      : isCurrentDay
                        ? "ring-2 ring-gold text-forest hover:bg-pink/20"
                        : "text-forest hover:bg-pink/20 active:bg-pink/30"
                  }
                `}
                data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-3 py-2 bg-powder/50 border-t border-pink/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-1">
            {isEditMode ? (
              <div className="flex flex-wrap gap-1">
                {selectedDates.map((date, index) => (
                  <span
                    key={date.toISOString()}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-pink/20 text-forest text-xs rounded-full"
                  >
                    {format(date, "M/d")}
                    <button
                      onClick={() => setSelectedDates(prev => prev.filter((_, i) => i !== index))}
                      className="text-pink hover:text-forest transition-colors"
                      title="Remove this date"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                {selectedDates.length === 0 && (
                  <span className="text-xs text-gold italic">No dates - tap calendar to add</span>
                )}
              </div>
            ) : (
              <span className="text-xs text-forest">
                {formatSelectedDates()}
              </span>
            )}
          </div>
          {selectedDates.length > 0 && (
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`p-1 transition-colors ${isEditMode ? "text-pink" : "text-gold hover:text-forest"}`}
              title={isEditMode ? "Done editing" : "Edit selection"}
            >
              {isEditMode ? <Check size={14} /> : <Edit2 size={14} />}
            </button>
          )}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-1 py-2 px-3 text-sm text-forest border border-forest/20 rounded-lg hover:bg-forest/5 transition-colors touch-manipulation"
            data-testid="button-cancel-calendar"
          >
            <X size={14} />
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedDates.length === 0}
            className="flex-1 flex items-center justify-center gap-1 py-2 px-3 text-sm bg-pink text-white rounded-lg hover:bg-pink/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
            data-testid="button-confirm-calendar"
          >
            <Check size={14} />
            Confirm
          </button>
        </div>
      </div>

      {multiSelect && (
        <div className="px-3 py-2 bg-powder/30 border-t border-pink/10 text-center">
          <span className="text-[0.65rem] text-gold italic">
            Tap multiple dates to select a range
          </span>
        </div>
      )}
    </div>
  );
}
