import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
}

interface Booking {
  id: string;
  clientName: string;
  eventDate: string;
  eventLocation?: string;
  arrivalTime?: string;
  onSiteContact?: string;
  onSiteContactPhone?: string;
  notes?: string;
  serviceType?: string;
}

interface DayOfReadinessProps {
  booking: Booking;
  className?: string;
  defaultExpanded?: boolean;
}

export default function DayOfReadiness({
  booking,
  className,
  defaultExpanded = false,
}: DayOfReadinessProps) {
  const { toast } = useToast();
  const [checklist, setChecklist] = useState<{
    id: string;
    items: ChecklistItem[];
    allCompleted: boolean;
    completedAt?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    fetchChecklist();
  }, [booking.id]);

  const fetchChecklist = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/checklist?type=day_of_readiness`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.items) {
          setChecklist(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch checklist:", err);
      toast({
        title: "Error",
        description: "Could not load readiness checklist",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleItemToggle = async (itemId: string, completed: boolean) => {
    if (!checklist) return;
    setUpdating(itemId);

    const updatedItems = checklist.items.map((item) =>
      item.id === itemId
        ? { ...item, completed, completedAt: completed ? new Date().toISOString() : undefined }
        : item
    );

    const allDone = updatedItems.every((item) => item.completed);

    try {
      const res = await fetch(`/api/bookings/${booking.id}/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: updatedItems,
          allCompleted: allDone,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChecklist(data);
        
        if (allDone && !checklist.allCompleted) {
          toast({
            title: "All set!",
            description: "You're fully prepared for this appointment.",
          });
        }
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update checklist",
        variant: "destructive",
      });
    }
    setUpdating(null);
  };

  const completedCount = checklist?.items.filter((i) => i.completed).length || 0;
  const totalCount = checklist?.items.length || 0;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const eventDate = new Date(booking.eventDate);
  const isEventToday = new Date().toDateString() === eventDate.toDateString();
  const isEventSoon = eventDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  if (loading) {
    return (
      <Card className={className} data-testid={`readiness-loading-${booking.id}`}>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#5A1F2B]" />
        </CardContent>
      </Card>
    );
  }

  if (!checklist || !checklist.items || checklist.items.length === 0) {
    return (
      <Card className={className} data-testid={`readiness-empty-${booking.id}`}>
        <CardContent className="py-4 text-center text-sm text-gray-500">
          <AlertCircle className="h-5 w-5 mx-auto mb-2 text-gray-400" />
          <p>Unable to load checklist</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} ${isEventToday ? "ring-2 ring-[#5A1F2B]" : ""}`} data-testid={`readiness-card-${booking.id}`}>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-2">
                {checklist?.allCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : isEventToday ? (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                ) : (
                  <Clock className="h-5 w-5 text-[#5A1F2B]" />
                )}
                <CardTitle className="text-base">Day-of Readiness</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {isEventToday && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Today
                  </Badge>
                )}
                <Badge variant="secondary">
                  {completedCount}/{totalCount}
                </Badge>
                <Button variant="ghost" size="sm" className="p-1">
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CollapsibleTrigger>
          
          <Progress value={progress} className="h-1.5 mt-2" />
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-500 text-xs">Arrival Time</p>
                  <p className="font-medium">{booking.arrivalTime || "Not specified"}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-500 text-xs">Location</p>
                  <p className="font-medium truncate">{booking.eventLocation || "TBD"}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-500 text-xs">On-site Contact</p>
                  <p className="font-medium">
                    {booking.onSiteContact || booking.clientName}
                    {booking.onSiteContactPhone && (
                      <span className="text-gray-500 ml-1">
                        ({booking.onSiteContactPhone})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              {booking.notes && (
                <div className="flex items-start gap-2 sm:col-span-2">
                  <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-500 text-xs">Prep Notes</p>
                    <p className="font-medium">{booking.notes}</p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Prep Checklist</p>
              {checklist?.items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    item.completed
                      ? "bg-green-50"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                  data-testid={`checklist-item-${item.id}`}
                >
                  <Checkbox
                    id={item.id}
                    checked={item.completed}
                    disabled={updating === item.id}
                    onCheckedChange={(checked) =>
                      handleItemToggle(item.id, checked as boolean)
                    }
                    data-testid={`checkbox-${item.id}`}
                  />
                  <label
                    htmlFor={item.id}
                    className={`flex-1 text-sm cursor-pointer ${
                      item.completed ? "text-gray-500 line-through" : ""
                    }`}
                  >
                    {item.label}
                  </label>
                  {updating === item.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-[#5A1F2B]" />
                  )}
                  {item.completed && !updating && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                </div>
              ))}
            </div>

            {checklist?.allCompleted && (
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-sm font-medium text-green-800">
                  You're all set for {booking.clientName}'s appointment!
                </p>
                {checklist.completedAt && (
                  <p className="text-xs text-green-600 mt-1">
                    Completed {new Date(checklist.completedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
