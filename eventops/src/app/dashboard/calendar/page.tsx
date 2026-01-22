'use client';

import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, User, Building2, ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Meeting {
  id: string;
  personId: string;
  scheduledAt: string;
  duration: number;
  location: string;
  status: string;
  meetingType: string;
  notes?: string;
  people: {
    name: string;
    title: string;
    target_accounts: {
      name: string;
      icpScore: number;
    };
  };
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  meetings: Meeting[];
}

export default function CalendarPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/meetings?status=SCHEDULED');
      const data = await res.json();
      setMeetings(data);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calendar generation
  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
    
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // End on Saturday
    
    const days: CalendarDay[] = [];
    const currentDay = new Date(startDate);
    
    while (currentDay <= endDate) {
      const dateStr = currentDay.toISOString().split('T')[0];
      const dayMeetings = meetings.filter(m => {
        const meetingDate = new Date(m.scheduledAt).toISOString().split('T')[0];
        return meetingDate === dateStr;
      });
      
      days.push({
        date: new Date(currentDay),
        isCurrentMonth: currentDay.getMonth() === month,
        meetings: dayMeetings,
      });
      
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  
  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const today = new Date().toISOString().split('T')[0];
  
  const selectedDayMeetings = selectedDate
    ? meetings.filter(m => {
        const meetingDate = new Date(m.scheduledAt).toISOString().split('T')[0];
        const selectedDateStr = selectedDate.toISOString().split('T')[0];
        return meetingDate === selectedDateStr;
      }).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    : [];

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    NO_SHOW: 'bg-gray-100 text-gray-800',
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-gray-600 mt-1">
            {meetings.length} scheduled meeting{meetings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/dashboard/meetings"
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          List View
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="Previous month"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            
            <h2 className="text-xl font-semibold">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="Next month"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              const dateStr = day.date.toISOString().split('T')[0];
              const isToday = dateStr === today;
              const isSelected = selectedDate && dateStr === selectedDate.toISOString().split('T')[0];
              const hasMeetings = day.meetings.length > 0;

              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(day.date)}
                  className={`
                    min-h-[80px] p-2 rounded-lg border transition
                    ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                    ${isToday ? 'border-blue-500 border-2' : 'border-gray-200'}
                    ${isSelected ? 'bg-blue-50 border-blue-500' : ''}
                    hover:bg-gray-50
                  `}
                >
                  <div className="text-right">
                    <span className={`
                      text-sm font-medium
                      ${isToday ? 'text-blue-600' : ''}
                      ${!day.isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}
                    `}>
                      {day.date.getDate()}
                    </span>
                  </div>
                  
                  {hasMeetings && (
                    <div className="mt-1 space-y-1">
                      {day.meetings.slice(0, 2).map(meeting => (
                        <div
                          key={meeting.id}
                          className="text-xs bg-blue-100 text-blue-800 rounded px-1 py-0.5 truncate"
                        >
                          {new Date(meeting.scheduledAt).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </div>
                      ))}
                      {day.meetings.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{day.meetings.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {selectedDate 
              ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
              : 'Select a date'
            }
          </h3>

          {selectedDate && selectedDayMeetings.length === 0 && (
            <p className="text-gray-500 text-sm">No meetings scheduled</p>
          )}

          {selectedDate && selectedDayMeetings.length > 0 && (
            <div className="space-y-3">
              {selectedDayMeetings.map(meeting => {
                const meetingDate = new Date(meeting.scheduledAt);
                const endTime = new Date(meetingDate.getTime() + meeting.duration * 60000);

                return (
                  <Link
                    key={meeting.id}
                    href={`/dashboard/meetings/${meeting.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >
                    {/* Time */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatTime(meetingDate)} - {formatTime(endTime)}
                      </span>
                    </div>

                    {/* Person & Company */}
                    <div className="font-medium mb-1">{meeting.people.name}</div>
                    <div className="text-sm text-gray-600 mb-1">{meeting.people.title}</div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Building2 className="h-4 w-4" />
                      <span>{meeting.people.target_accounts.name}</span>
                    </div>

                    {/* Location */}
                    {meeting.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <MapPin className="h-4 w-4" />
                        <span>{meeting.location}</span>
                      </div>
                    )}

                    {/* Status */}
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[meeting.status]}`}>
                        {meeting.status}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {meeting.meetingType}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
