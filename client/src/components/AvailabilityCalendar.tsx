import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseToLocalDate(dateString: string): string {
  // Extract just the date part from ISO string to avoid timezone shift
  // e.g., "2025-02-14T12:00:00.000Z" -> "2025-02-14"
  if (dateString.includes('T')) {
    return dateString.split('T')[0];
  }
  // If it's already just a date, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  // Fallback: parse and extract
  const d = new Date(dateString);
  return toLocalDateKey(d);
}

interface AvailabilityCalendarProps {
  userId: string;
  onDateSelect?: (date: Date, status: string) => void;
  onRequestBooking?: (date: Date) => void;
  onCreateBooking?: (date: Date) => void;
  viewOnly?: boolean;
  refreshKey?: number;
}

interface AvailabilityRecord {
  id: string;
  date: string;
  isAvailable: boolean;
  notes?: string;
}

interface BookingRecord {
  id: string;
  eventDate: string;
  status: string;
  serviceType: string;
  clientId?: string;
}

interface InquiryHold {
  id: string;
  eventDate: string;
  status: string;
  holdExpiresAt?: string;
  clientName: string;
}

type DateStatus = 'booked' | 'pending' | 'blocked' | 'available' | 'hold';

export default function AvailabilityCalendar({ userId, onDateSelect, onRequestBooking, onCreateBooking, viewOnly = false, refreshKey = 0 }: AvailabilityCalendarProps) {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [bookings, setBookings] = useState<Record<string, { status: string; id: string }>>({});
  const [holds, setHolds] = useState<Record<string, { id: string; expiresAt?: string; clientName: string }>>({});
  const [loading, setLoading] = useState(false);

  const monthNames = ["January", "February", "March", "April", "May", "June", 
                      "July", "August", "September", "October", "November", "December"];

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  useEffect(() => {
    fetchCalendarData();
  }, [currentMonth, userId, refreshKey]);

  const fetchCalendarData = async () => {
    if (!userId) return;
    
    const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    try {
      const [availResponse, bookingsResponse, inquiriesResponse] = await Promise.all([
        fetch(
          `/api/availability/${userId}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
          { credentials: "include" }
        ),
        fetch(
          `/api/bookings/artist/${userId}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
          { credentials: "include" }
        ),
        fetch(`/api/vendor/inquiries`, { credentials: "include" })
      ]);

      if (availResponse.ok) {
        const data: AvailabilityRecord[] = await availResponse.json();
        const avail: Record<string, boolean> = {};
        data.forEach((record) => {
          const dateKey = parseToLocalDate(record.date);
          avail[dateKey] = record.isAvailable;
        });
        setAvailability(avail);
      }

      if (bookingsResponse.ok) {
        const data: BookingRecord[] = await bookingsResponse.json();
        const bookingMap: Record<string, { status: string; id: string }> = {};
        data.forEach((booking) => {
          const dateKey = parseToLocalDate(booking.eventDate);
          bookingMap[dateKey] = { status: booking.status, id: booking.id };
        });
        setBookings(bookingMap);
      }

      if (inquiriesResponse.ok) {
        const data: InquiryHold[] = await inquiriesResponse.json();
        const holdMap: Record<string, { id: string; expiresAt?: string; clientName: string }> = {};
        data.forEach((inquiry) => {
          if (inquiry.status === 'hold' && inquiry.eventDate) {
            const dateKey = parseToLocalDate(inquiry.eventDate);
            holdMap[dateKey] = { 
              id: inquiry.id, 
              expiresAt: inquiry.holdExpiresAt,
              clientName: inquiry.clientName 
            };
          }
        });
        setHolds(holdMap);
      }
    } catch (err) {
      console.error("Error fetching calendar data:", err);
    }
  };

  const toggleDateBlock = async (date: Date) => {
    if (viewOnly) return;
    
    const dateKey = toLocalDateKey(date);
    const booking = bookings[dateKey];
    
    if (booking && (booking.status === 'accepted' || booking.status === 'pending')) {
      toast({ 
        title: "Cannot modify", 
        description: "This date has a booking. Manage it from your bookings.", 
        variant: "destructive" 
      });
      return;
    }
    
    const isCurrentlyBlocked = availability[dateKey] === false;
    const newBlockedStatus = !isCurrentlyBlocked;
    
    setLoading(true);
    try {
      const isoDate = `${dateKey}T12:00:00.000Z`;
      if (isCurrentlyBlocked) {
        await fetch("/api/availability", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ date: isoDate }),
        });
        const newAvail = { ...availability };
        delete newAvail[dateKey];
        setAvailability(newAvail);
        toast({ title: "Date unblocked", description: `${dateKey} is now available for requests` });
      } else {
        const response = await fetch("/api/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ date: isoDate, isAvailable: false }),
        });
        if (response.ok) {
          setAvailability({ ...availability, [dateKey]: false });
          toast({ title: "Date blocked", description: `${dateKey} is now blocked` });
        }
      }
      onDateSelect?.(date, newBlockedStatus ? 'blocked' : 'available');
    } catch (err) {
      console.error("Error updating availability:", err);
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
    setLoading(false);
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const navigateMonth = (direction: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const getDateStatus = (date: Date): DateStatus => {
    const dateKey = toLocalDateKey(date);
    const booking = bookings[dateKey];
    const hold = holds[dateKey];
    
    if (booking) {
      if (booking.status === 'accepted' || booking.status === 'completed') return 'booked';
      if (booking.status === 'pending') return 'pending';
    }
    
    if (hold) return 'hold';
    
    if (availability[dateKey] === false) return 'blocked';
    
    return 'available';
  };

  const getStatusStyles = (status: DateStatus, past: boolean, canBook: boolean) => {
    if (past) {
      return 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50';
    }
    
    switch (status) {
      case 'booked':
        return 'bg-forest text-white cursor-default';
      case 'pending':
        return 'bg-gold/30 text-forest cursor-default border border-gold/50';
      case 'hold':
        return 'bg-orange-100 text-orange-800 cursor-default border border-orange-300';
      case 'blocked':
        return viewOnly 
          ? 'bg-gray-200 text-gray-500 cursor-default' 
          : 'bg-gray-200 text-gray-500 cursor-pointer hover:bg-gray-300';
      case 'available':
      default:
        return canBook || !viewOnly
          ? 'bg-pink/15 text-pink cursor-pointer hover:bg-pink/25 border border-pink/40'
          : 'bg-pink/15 text-pink cursor-default border border-pink/40';
    }
  };

  const getStatusLabel = (status: DateStatus): string => {
    switch (status) {
      case 'booked': return 'Booked';
      case 'pending': return 'Pending';
      case 'hold': return 'On Hold';
      case 'blocked': return 'Blocked';
      case 'available': return 'Request to Book';
    }
  };
  
  const getHoldCountdown = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    if (diffMs <= 0) return 'Exp';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h` : `${mins}m`;
  };

  const days = getDaysInMonth();

  return (
    <div className="card-frame rounded-md px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-header text-md ink-main">
          {viewOnly ? "Availability" : "My Calendar"}
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigateMonth(-1)}
            className="p-1 hover:bg-black/10 rounded transition-colors"
            data-testid="button-prev-month"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button 
            onClick={() => navigateMonth(1)}
            className="p-1 hover:bg-black/10 rounded transition-colors"
            data-testid="button-next-month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map(day => (
          <div key={day} className="text-center text-[0.6rem] uppercase tracking-wide ink-soft py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="h-8" />;
          }
          
          const status = getDateStatus(date);
          const past = isPast(date);
          const today = isToday(date);
          const canBook = viewOnly && onRequestBooking && status === 'available' && !past;
          const canInteract = !past && !viewOnly && (status === 'available' || status === 'blocked');
          
          const handleClick = () => {
            if (canBook) {
              onRequestBooking(date);
            } else if (!viewOnly && onCreateBooking && status === 'available' && !past) {
              onCreateBooking(date);
            } else if (canInteract) {
              toggleDateBlock(date);
            }
          };
          
          const dateKey = toLocalDateKey(date);
          const hold = holds[dateKey];
          
          return (
            <button
              key={date.toISOString()}
              onClick={handleClick}
              disabled={(!canInteract && !canBook) || loading}
              title={canBook ? 'Click to request booking' : hold ? `Hold: ${hold.clientName}` : getStatusLabel(status)}
              className={`
                h-8 rounded text-xs relative transition-all
                ${today ? 'ring-2 ring-gold ring-offset-1' : ''}
                ${getStatusStyles(status, past, !!canBook)}
              `}
              data-testid={`calendar-day-${date.getDate()}`}
            >
              {date.getDate()}
              {status === 'hold' && hold?.expiresAt && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[0.45rem] px-1 rounded-full font-semibold flex items-center gap-0.5">
                  <Clock size={6} />
                  {getHoldCountdown(hold.expiresAt)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-[0.65rem]">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-pink/15 rounded border border-pink/40" />
          <span className="ink-soft">Request</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gold/30 rounded border border-gold/50" />
          <span className="ink-soft">Pending</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-orange-100 rounded border border-orange-300" />
          <span className="ink-soft">Hold</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-forest rounded" />
          <span className="ink-soft">Booked</span>
        </div>
      </div>

      {!viewOnly && (
        <p className="text-center text-[0.6rem] ink-soft mt-3">
          Click a date to block/unblock it
        </p>
      )}
      {viewOnly && onRequestBooking && (
        <p className="text-center text-[0.6rem] ink-soft mt-3">
          Click an available date to request booking
        </p>
      )}
    </div>
  );
}
