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

type DateStatus = 'booked' | 'pending' | 'blocked' | 'available' | 'hold' | 'manual_booked';

export default function AvailabilityCalendar({ userId, onDateSelect, onRequestBooking, onCreateBooking, viewOnly = false, refreshKey = 0 }: AvailabilityCalendarProps) {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [manualBooked, setManualBooked] = useState<Record<string, boolean>>({});
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
        const manual: Record<string, boolean> = {};
        data.forEach((record) => {
          const dateKey = parseToLocalDate(record.date);
          avail[dateKey] = record.isAvailable;
          if (record.notes === 'BOOKED') {
            manual[dateKey] = true;
          }
        });
        setAvailability(avail);
        setManualBooked(manual);
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

  const cycleStatus = async (date: Date) => {
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
    
    const currentStatus = getDateStatus(date);
    let nextStatus: 'available' | 'blocked' | 'manual_booked';
    let toastTitle: string;
    let toastDesc: string;
    
    // Cycle: available → blocked → booked → available
    if (currentStatus === 'available') {
      nextStatus = 'blocked';
      toastTitle = "Date blocked";
      toastDesc = `${dateKey} is now blocked`;
    } else if (currentStatus === 'blocked') {
      nextStatus = 'manual_booked';
      toastTitle = "Marked as booked";
      toastDesc = `${dateKey} is marked as booked`;
    } else if (currentStatus === 'manual_booked') {
      nextStatus = 'available';
      toastTitle = "Date available";
      toastDesc = `${dateKey} is now available`;
    } else {
      return; // Can't modify holds or real bookings
    }
    
    setLoading(true);
    try {
      // Use noon local time to avoid timezone date shifts
      const localNoon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
      const isoDate = localNoon.toISOString();
      
      if (nextStatus === 'available') {
        // Clear both blocked and manual booked
        await fetch("/api/availability", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ date: isoDate }),
        });
        const newAvail = { ...availability };
        delete newAvail[dateKey];
        setAvailability(newAvail);
        const newManual = { ...manualBooked };
        delete newManual[dateKey];
        setManualBooked(newManual);
      } else if (nextStatus === 'blocked') {
        const response = await fetch("/api/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ date: isoDate, isAvailable: false }),
        });
        if (response.ok) {
          setAvailability({ ...availability, [dateKey]: false });
          const newManual = { ...manualBooked };
          delete newManual[dateKey];
          setManualBooked(newManual);
        }
      } else if (nextStatus === 'manual_booked') {
        // Mark as manually booked (uses availability with a flag)
        const response = await fetch("/api/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ date: isoDate, isAvailable: false, notes: 'BOOKED' }),
        });
        if (response.ok) {
          setAvailability({ ...availability, [dateKey]: false });
          setManualBooked({ ...manualBooked, [dateKey]: true });
        }
      }
      
      toast({ title: toastTitle, description: toastDesc });
      onDateSelect?.(date, nextStatus);
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
    
    // Check for manually marked as booked
    if (manualBooked[dateKey]) return 'manual_booked';
    
    if (availability[dateKey] === false) return 'blocked';
    
    return 'available';
  };

  const getStatusStyles = (status: DateStatus, past: boolean, canBook: boolean) => {
    if (past) {
      return 'bg-[#333] text-[#F5F0E8]/30 cursor-not-allowed opacity-50';
    }
    
    switch (status) {
      case 'booked':
        return 'bg-[#C4A35A] text-[#1A1A1A] cursor-default';
      case 'manual_booked':
        return viewOnly
          ? 'bg-[#C4A35A]/80 text-[#1A1A1A] cursor-default'
          : 'bg-[#C4A35A]/80 text-[#1A1A1A] cursor-pointer hover:bg-[#C4A35A]';
      case 'pending':
        return 'bg-[#C4A35A]/40 text-[#F5F0E8] cursor-default border border-[#C4A35A]/60';
      case 'hold':
        return 'bg-[#C4A35A]/30 text-[#F5F0E8] cursor-default border border-[#C4A35A]/50';
      case 'blocked':
        return viewOnly 
          ? 'bg-[#5C1F1F] text-[#F5F0E8]/80 cursor-default' 
          : 'bg-[#5C1F1F] text-[#F5F0E8]/80 cursor-pointer hover:bg-[#6C2F2F]';
      case 'available':
      default:
        return canBook || !viewOnly
          ? 'bg-[#F5F0E8]/10 text-[#F5F0E8] cursor-pointer hover:bg-[#F5F0E8]/20 border border-[#F5F0E8]/20'
          : 'bg-[#F5F0E8]/10 text-[#F5F0E8] cursor-default border border-[#F5F0E8]/20';
    }
  };

  const getStatusLabel = (status: DateStatus): string => {
    switch (status) {
      case 'booked': return 'Booked';
      case 'manual_booked': return 'Booked (Manual)';
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
    <div className="bg-[#1A1A1A] border border-[#F5F0E8]/10 rounded-md px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-header text-md text-[#F5F0E8]">
          {viewOnly ? "Availability" : "My Calendar"}
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigateMonth(-1)}
            className="p-1 hover:bg-[#F5F0E8]/10 rounded transition-colors text-[#F5F0E8]"
            data-testid="button-prev-month"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium min-w-[120px] text-center text-[#F5F0E8]">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button 
            onClick={() => navigateMonth(1)}
            className="p-1 hover:bg-[#F5F0E8]/10 rounded transition-colors text-[#F5F0E8]"
            data-testid="button-next-month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map(day => (
          <div key={day} className="text-center text-[0.6rem] uppercase tracking-wide text-[#F5F0E8]/60 py-1">
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
          const canInteract = !past && !viewOnly && (status === 'available' || status === 'blocked' || status === 'manual_booked');
          
          const handleClick = () => {
            if (canBook) {
              onRequestBooking(date);
            } else if (!viewOnly && onCreateBooking && status === 'available' && !past) {
              onCreateBooking(date);
            } else if (canInteract) {
              cycleStatus(date);
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
                ${today ? 'ring-2 ring-[#C4A35A] ring-offset-1 ring-offset-[#1A1A1A]' : ''}
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
          <div className="w-3 h-3 bg-[#F5F0E8]/10 rounded border border-[#F5F0E8]/20" />
          <span className="text-[#F5F0E8]/60">Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-[#5C1F1F] rounded" />
          <span className="text-[#F5F0E8]/60">Blocked</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-[#C4A35A] rounded" />
          <span className="text-[#F5F0E8]/60">Booked</span>
        </div>
      </div>

      {!viewOnly && (
        <p className="text-center text-[0.6rem] text-[#F5F0E8]/50 mt-3">
          Click to cycle: Available → Blocked → Booked
        </p>
      )}
      {viewOnly && onRequestBooking && (
        <p className="text-center text-[0.6rem] text-[#F5F0E8]/50 mt-3">
          Click an available date to request booking
        </p>
      )}
    </div>
  );
}
