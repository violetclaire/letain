import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Edit2, Check, X, Calendar } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, startOfDay } from "date-fns";

interface VintageCalendarProps {
  bookedDates: Date[];
  onDatesChange: (dates: Date[]) => void;
  minYear?: number;
  maxYear?: number;
}

export default function VintageCalendar({
  bookedDates,
  onDatesChange,
  minYear = 2026,
  maxYear = 2027
}: VintageCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(minYear, 0, 1));
  const [isEditMode, setIsEditMode] = useState(false);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startDay = startOfMonth(currentMonth).getDay();
  const emptyDays = Array(startDay).fill(null);

  const canGoPrev = currentMonth.getFullYear() > minYear || 
    (currentMonth.getFullYear() === minYear && currentMonth.getMonth() > 0);
  const canGoNext = currentMonth.getFullYear() < maxYear || 
    (currentMonth.getFullYear() === maxYear && currentMonth.getMonth() < 11);

  const handlePrevMonth = () => {
    if (canGoPrev) {
      setCurrentMonth(subMonths(currentMonth, 1));
    }
  };

  const handleNextMonth = () => {
    if (canGoNext) {
      setCurrentMonth(addMonths(currentMonth, 1));
    }
  };

  const handleDateClick = (date: Date) => {
    const isBooked = bookedDates.some(d => isSameDay(d, date));
    if (isBooked) {
      onDatesChange(bookedDates.filter(d => !isSameDay(d, date)));
    } else {
      onDatesChange([...bookedDates, date].sort((a, b) => a.getTime() - b.getTime()));
    }
  };

  const formatBookedCount = () => {
    if (bookedDates.length === 0) return "No dates booked";
    if (bookedDates.length === 1) return "1 date booked";
    return `${bookedDates.length} dates booked`;
  };

  const monthsWithBookings = useMemo(() => {
    const months: { [key: string]: number } = {};
    bookedDates.forEach(date => {
      const key = format(date, "yyyy-MM");
      months[key] = (months[key] || 0) + 1;
    });
    return months;
  }, [bookedDates]);

  const currentMonthKey = format(currentMonth, "yyyy-MM");
  const currentMonthBookings = monthsWithBookings[currentMonthKey] || 0;

  return (
    <div 
      className="rounded-xl overflow-hidden shadow-lg border-2 border-[#c5ccd8] bg-cream"
      data-testid="vintage-calendar"
    >
      <div className="px-4 py-3 border-b border-[#c5ccd8] bg-powder-blue/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-pink" />
            <span className="text-sm font-header ink-main">Your Availability</span>
          </div>
          <span className="text-xs ink-soft">{formatBookedCount()}</span>
        </div>
      </div>

      <div className="p-4 bg-cream">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevMonth}
            disabled={!canGoPrev}
            className="p-2 rounded-full transition-all duration-200 touch-manipulation disabled:opacity-30 hover:bg-powder-blue/50"
            data-testid="button-prev-month"
          >
            <ChevronLeft size={22} className="text-forest" />
          </button>
          
          <div className="text-center">
            <span className="text-xl font-header ink-main tracking-wide">
              {format(currentMonth, "MMMM")}
            </span>
            <span className="text-lg ml-2 ink-soft">
              {format(currentMonth, "yyyy")}
            </span>
            {currentMonthBookings > 0 && (
              <div className="text-xs mt-1 text-pink">
                {currentMonthBookings} booked this month
              </div>
            )}
          </div>
          
          <button
            onClick={handleNextMonth}
            disabled={!canGoNext}
            className="p-2 rounded-full transition-all duration-200 touch-manipulation disabled:opacity-30 hover:bg-powder-blue/50"
            data-testid="button-next-month"
          >
            <ChevronRight size={22} className="text-forest" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
            <div 
              key={`${day}-${i}`}
              className="text-center text-xs font-medium py-2 text-gold"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {days.map(day => {
            const isBooked = bookedDates.some(d => isSameDay(d, day));
            const isCurrentDay = isToday(day);
            const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDateClick(day)}
                className={`
                  aspect-square flex items-center justify-center text-sm rounded-lg
                  transition-all duration-200 touch-manipulation
                  min-h-[44px] min-w-[44px] relative
                  ${isPast ? 'opacity-40' : 'hover:scale-105'}
                  ${isBooked 
                    ? 'bg-pink text-white font-medium shadow-md' 
                    : isCurrentDay 
                      ? 'ring-2 ring-gold ink-main bg-powder-blue/30' 
                      : 'ink-main hover:bg-powder-blue/50'
                  }
                `}
                data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
              >
                {format(day, "d")}
                {isBooked && isEditMode && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center bg-forest">
                    <X size={10} className="text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {bookedDates.length > 0 && (
        <div className="px-4 py-3 border-t border-[#c5ccd8] bg-powder-blue/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium ink-main">
              {isEditMode ? "Tap dates above to remove" : "Booked dates:"}
            </span>
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`p-1.5 rounded-full transition-colors ${isEditMode ? 'bg-pink text-white' : 'bg-powder-blue/50 text-forest hover:bg-powder-blue'}`}
              title={isEditMode ? "Done editing" : "Edit booked dates"}
              data-testid="button-edit-dates"
            >
              {isEditMode ? <Check size={14} /> : <Edit2 size={14} />}
            </button>
          </div>
          
          {isEditMode ? (
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {bookedDates.slice(0, 12).map((date) => (
                <span
                  key={date.toISOString()}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs cursor-pointer transition-colors hover:opacity-80 bg-pink text-white"
                  onClick={() => handleDateClick(date)}
                >
                  {format(date, "M/d")}
                  <X size={10} />
                </span>
              ))}
              {bookedDates.length > 12 && (
                <span className="text-xs py-1 ink-soft">+{bookedDates.length - 12} more</span>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {bookedDates.slice(0, 8).map((date) => (
                <span
                  key={date.toISOString()}
                  className="px-2 py-1 rounded-full text-xs bg-pink/20 text-pink"
                >
                  {format(date, "MMM d")}
                </span>
              ))}
              {bookedDates.length > 8 && (
                <span className="text-xs py-1 ink-soft">+{bookedDates.length - 8} more</span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="px-4 py-2 text-center border-t border-[#c5ccd8] bg-cream">
        <span className="text-xs italic ink-soft">
          Tap any date to mark as booked
        </span>
      </div>
    </div>
  );
}
