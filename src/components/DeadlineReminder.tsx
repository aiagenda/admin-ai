import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, AlertCircle, Download, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInDays, isPast, addDays } from "date-fns";
import { getAppDateLocale } from "@/lib/dateLocale";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface UpcomingDeadline {
  id: string;
  document_id: string;
  filename: string;
  deadline: string;
  severity: string;
  daysUntil: number;
  analysis_id: string;
}

export function DeadlineReminder() {
  const { t } = useTranslation("common");
  const dl = "deadlines";
  const dateLoc = getAppDateLocale();
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<UpcomingDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const fetchUpcomingDeadlines = async () => {
      try {
        // Get all analyses with deadlines in the next 30 days
        const thirtyDaysFromNow = addDays(new Date(), 30).toISOString();
        const now = new Date().toISOString();

        const { data: analysesData, error: analysesError } = await supabase
          .from("analyses")
          .select(`
            id,
            document_id,
            deadline,
            severity,
            documents!inner (
              id,
              filename
            )
          `)
          .not("deadline", "is", null)
          .gte("deadline", now)
          .lte("deadline", thirtyDaysFromNow)
          .order("deadline", { ascending: true })
          .limit(10);

        if (analysesError) throw analysesError;

        const deadlines: UpcomingDeadline[] = (analysesData || [])
          .map((analysis: any) => {
            const deadlineDate = new Date(analysis.deadline);
            const daysUntil = differenceInDays(deadlineDate, new Date());
            return {
              id: analysis.id,
              document_id: analysis.documents.id,
              filename: analysis.documents.filename,
              deadline: analysis.deadline,
              severity: analysis.severity,
              daysUntil,
              analysis_id: analysis.id,
            };
          })
          .filter((d) => d.daysUntil >= 0) // Only future deadlines
          .sort((a, b) => a.daysUntil - b.daysUntil);

        setUpcomingDeadlines(deadlines);
      } catch (error) {
        console.error("Error fetching deadlines:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingDeadlines();
  }, [user]);

  const exportToCalendar = (deadline: UpcomingDeadline) => {
    const startDate = new Date(deadline.deadline);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour event

    // Format dates for iCal
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NoticeIQ//Deadline Reminder//EN
BEGIN:VEVENT
UID:${deadline.id}@adminai.hu
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:Deadline: ${deadline.filename}
DESCRIPTION:Document deadline: ${deadline.filename}\\nAdminAI - ${window.location.origin}/result/${deadline.analysis_id}
LOCATION:NoticeIQ
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icalContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hatarido-${deadline.filename.replace(/[^a-z0-9]/gi, "_")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAllToCalendar = () => {
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    let icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NoticeIQ//Deadline Reminders//EN
`;

    upcomingDeadlines.forEach((deadline) => {
      const startDate = new Date(deadline.deadline);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      icalContent += `BEGIN:VEVENT
UID:${deadline.id}@adminai.hu
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:Deadline: ${deadline.filename}
DESCRIPTION:Document deadline: ${deadline.filename}\\nAdminAI - ${window.location.origin}/result/${deadline.analysis_id}
LOCATION:NoticeIQ
STATUS:CONFIRMED
END:VEVENT
`;
    });

    icalContent += `END:VCALENDAR`;

    const blob = new Blob([icalContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `adminai-hataridok.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t(`${dl}.title`)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">{t("loading")}</div>
        </CardContent>
      </Card>
    );
  }

  if (upcomingDeadlines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t(`${dl}.title`)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            {t(`${dl}.empty`)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const urgentDeadlines = upcomingDeadlines.filter((d) => d.daysUntil <= 7);
  const soonDeadlines = upcomingDeadlines.filter((d) => d.daysUntil > 7 && d.daysUntil <= 30);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t(`${dl}.title`)} ({upcomingDeadlines.length})
          </CardTitle>
          {upcomingDeadlines.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportAllToCalendar}>
              <Download className="h-4 w-4 mr-2" />
              {t(`${dl}.exportAll`)}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {urgentDeadlines.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {t(`${dl}.urgentSection`)}
            </h4>
            <div className="space-y-2">
              {urgentDeadlines.map((deadline) => (
                <div
                  key={deadline.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate(`/result/${deadline.analysis_id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{deadline.filename}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="destructive">
                        {deadline.daysUntil === 0
                          ? t(`${dl}.today`)
                          : deadline.daysUntil === 1
                            ? t(`${dl}.tomorrow`)
                            : t(`${dl}.daysCount`, { count: deadline.daysUntil })}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(deadline.deadline), "yyyy. MMMM d.", { locale: dateLoc })}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportToCalendar(deadline);
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {soonDeadlines.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">{t(`${dl}.next30`)}</h4>
            <div className="space-y-2">
              {soonDeadlines.map((deadline) => (
                <div
                  key={deadline.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate(`/result/${deadline.analysis_id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{deadline.filename}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={deadline.daysUntil <= 14 ? "default" : "secondary"}>
                        {t(`${dl}.daysCount`, { count: deadline.daysUntil })}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(deadline.deadline), "yyyy. MMMM d.", { locale: dateLoc })}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportToCalendar(deadline);
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

