"use client";

import * as React from "react";
import {
  add,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isEqual,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfToday,
  startOfWeek,
} from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useMediaQuery } from "@/hooks/use-media-query";

export interface CalendarEvent {
  id: number | string;
  name: string;
  time: string;
  datetime: string;
  room?: string;
}

export interface CalendarData {
  day: Date;
  events: CalendarEvent[];
}

export interface FullScreenCalendarProps {
  data: CalendarData[];
  onEventClick?: (event: CalendarEvent) => void;
  onDaySelect?: (day: Date) => void;
}

const colStartClasses = [
  "",
  "col-start-2",
  "col-start-3",
  "col-start-4",
  "col-start-5",
  "col-start-6",
  "col-start-7",
];

function getEventColor(event: CalendarEvent) {
  const room = event.room?.toLowerCase() || "";
  if (room.includes("audio-visual") || room.includes("avr")) {
    return {
      dot: "bg-emerald-500",
      badge: "border-emerald-500/20 bg-emerald-500/10",
      text: "text-emerald-400",
      label: "text-emerald-300",
    };
  }
  return {
    dot: "bg-blue-500",
    badge: "border-blue-500/20 bg-blue-500/10",
    text: "text-blue-400",
    label: "text-blue-300",
  };
}

export function FullScreenCalendar({
  data,
  onEventClick,
  onDaySelect,
}: FullScreenCalendarProps) {
  const today = startOfToday();
  const [selectedDay, setSelectedDay] = React.useState(today);
  const [currentMonth, setCurrentMonth] = React.useState(
    format(today, "MMM-yyyy"),
  );
  const firstDayCurrentMonth = parse(currentMonth, "MMM-yyyy", new Date());
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const days = eachDayOfInterval({
    start: startOfWeek(firstDayCurrentMonth),
    end: endOfWeek(endOfMonth(firstDayCurrentMonth)),
  });

  function previousMonth() {
    const firstDayPrevMonth = add(firstDayCurrentMonth, { months: -1 });
    setCurrentMonth(format(firstDayPrevMonth, "MMM-yyyy"));
  }

  function nextMonth() {
    const firstDayNextMonth = add(firstDayCurrentMonth, { months: 1 });
    setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"));
  }

  function goToToday() {
    setCurrentMonth(format(today, "MMM-yyyy"));
    handleDaySelect(today);
  }

  function handleDaySelect(day: Date) {
    setSelectedDay(day);
    onDaySelect?.(day);
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Calendar Header */}
      <div className="flex flex-col space-y-4 p-4 md:flex-row md:items-center md:justify-between md:space-y-0 lg:flex-none">
        <div className="flex flex-auto">
          <div className="flex items-center gap-4">
            <div className="hidden w-20 flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 p-0.5 md:flex">
              <h1 className="p-1 text-xs uppercase text-slate-400">
                {format(today, "MMM")}
              </h1>
              <div className="flex w-full items-center justify-center rounded-lg border border-white/10 bg-[#0b0714] p-0.5 text-lg font-bold text-white">
                <span>{format(today, "d")}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold text-white">
                {format(firstDayCurrentMonth, "MMMM, yyyy")}
              </h2>
              <p className="text-sm text-slate-400">
                {format(firstDayCurrentMonth, "MMM d, yyyy")} –{" "}
                {format(endOfMonth(firstDayCurrentMonth), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
          <Separator
            orientation="vertical"
            className="hidden h-6 bg-white/10 lg:block"
          />

          <div className="inline-flex w-full -space-x-px rounded-lg shadow-sm shadow-black/20 md:w-auto rtl:space-x-reverse">
            <Button
              onClick={previousMonth}
              className="rounded-none border-white/10 bg-white/5 text-slate-300 shadow-none first:rounded-s-lg last:rounded-e-lg hover:bg-white/10 hover:text-white focus-visible:z-10"
              variant="outline"
              size="icon"
              aria-label="Navigate to previous month"
            >
              <ChevronLeftIcon size={16} strokeWidth={2} aria-hidden="true" />
            </Button>
            <Button
              onClick={goToToday}
              className="w-full rounded-none border-white/10 bg-white/5 text-slate-300 shadow-none first:rounded-s-lg last:rounded-e-lg hover:bg-white/10 hover:text-white focus-visible:z-10 md:w-auto"
              variant="outline"
            >
              Today
            </Button>
            <Button
              onClick={nextMonth}
              className="rounded-none border-white/10 bg-white/5 text-slate-300 shadow-none first:rounded-s-lg last:rounded-e-lg hover:bg-white/10 hover:text-white focus-visible:z-10"
              variant="outline"
              size="icon"
              aria-label="Navigate to next month"
            >
              <ChevronRightIcon size={16} strokeWidth={2} aria-hidden="true" />
            </Button>
          </div>

          <Separator
            orientation="vertical"
            className="hidden h-6 bg-white/10 md:block"
          />
          <Separator
            orientation="horizontal"
            className="block w-full bg-white/10 md:hidden"
          />

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-500" />
              AVR
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-blue-500" />
              Training
            </span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="lg:flex lg:flex-auto lg:flex-col">
        {/* Week Days Header */}
        <div className="grid grid-cols-7 border border-white/10 text-center text-xs font-semibold leading-6 text-slate-400">
          <div className="border-r border-white/10 py-2.5">Sun</div>
          <div className="border-r border-white/10 py-2.5">Mon</div>
          <div className="border-r border-white/10 py-2.5">Tue</div>
          <div className="border-r border-white/10 py-2.5">Wed</div>
          <div className="border-r border-white/10 py-2.5">Thu</div>
          <div className="border-r border-white/10 py-2.5">Fri</div>
          <div className="py-2.5">Sat</div>
        </div>

        {/* Calendar Days */}
        <div className="flex text-xs leading-6 lg:flex-auto">
          {/* Desktop Grid */}
          <div className="hidden w-full border-x border-white/10 lg:grid lg:grid-cols-7 lg:grid-rows-5">
            {days.map((day, dayIdx) => (
              <div
                key={dayIdx}
                onClick={() => handleDaySelect(day)}
                className={cn(
                  dayIdx === 0 && colStartClasses[getDay(day)],
                  !isEqual(day, selectedDay) &&
                    !isToday(day) &&
                    !isSameMonth(day, firstDayCurrentMonth) &&
                    "bg-white/[0.01] text-slate-600",
                  "relative flex cursor-pointer flex-col border-b border-r border-white/10 transition-colors",
                  isEqual(day, selectedDay) &&
                    "bg-purple-500/10 border-purple-500/20",
                  !isEqual(day, selectedDay) && "hover:bg-white/5",
                )}
              >
                <header className="flex items-center justify-between p-2.5">
                  <button
                    type="button"
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors hover:border hover:border-white/20",
                      isEqual(day, selectedDay) &&
                        isToday(day) &&
                        "border-none bg-teal-500 font-bold text-white",
                      isEqual(day, selectedDay) &&
                        !isToday(day) &&
                        "bg-purple-500 font-semibold text-white",
                      !isEqual(day, selectedDay) &&
                        isToday(day) &&
                        "bg-teal-500 font-bold text-white",
                      !isEqual(day, selectedDay) &&
                        !isToday(day) &&
                        isSameMonth(day, firstDayCurrentMonth) &&
                        "text-slate-300",
                      !isEqual(day, selectedDay) &&
                        !isToday(day) &&
                        !isSameMonth(day, firstDayCurrentMonth) &&
                        "text-slate-600",
                    )}
                  >
                    <time dateTime={format(day, "yyyy-MM-dd")}>
                      {format(day, "d")}
                    </time>
                  </button>
                </header>
                <div className="flex-1 p-2.5 pt-0">
                  {data
                    .filter((event) => isSameDay(event.day, day))
                    .map((dateEvents) => (
                      <div
                        key={dateEvents.day.toString()}
                        className="space-y-1.5"
                      >
                        {dateEvents.events.slice(0, 2).map((event) => {
                          const color = getEventColor(event);
                          return (
                            <div
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onEventClick?.(event);
                              }}
                              className={cn(
                                "flex flex-col items-start gap-0.5 rounded-lg border p-1.5 text-xs leading-tight backdrop-blur-sm transition-colors hover:bg-white/5",
                                color.badge,
                              )}
                            >
                              <p
                                className={cn(
                                  "font-medium leading-none truncate w-full",
                                  color.label,
                                )}
                              >
                                {event.name}
                              </p>
                              <p className="leading-none text-slate-500">
                                {event.time}
                              </p>
                            </div>
                          );
                        })}
                        {dateEvents.events.length > 2 && (
                          <div className="text-xs text-slate-500">
                            + {dateEvents.events.length - 2} more
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Grid */}
          <div className="isolate grid w-full grid-cols-7 grid-rows-5 border-x border-white/10 lg:hidden">
            {days.map((day, dayIdx) => (
              <button
                onClick={() => handleDaySelect(day)}
                key={dayIdx}
                type="button"
                className={cn(
                  "flex h-14 flex-col border-b border-r border-white/10 px-3 py-2 transition-colors hover:bg-white/5 focus:z-10",
                  isEqual(day, selectedDay) && "bg-purple-500/10",
                  !isEqual(day, selectedDay) &&
                    !isToday(day) &&
                    isSameMonth(day, firstDayCurrentMonth) &&
                    "text-slate-300",
                  !isEqual(day, selectedDay) &&
                    !isToday(day) &&
                    !isSameMonth(day, firstDayCurrentMonth) &&
                    "text-slate-600",
                  (isEqual(day, selectedDay) || isToday(day)) &&
                    "font-semibold",
                )}
              >
                <time
                  dateTime={format(day, "yyyy-MM-dd")}
                  className={cn(
                    "ml-auto flex size-6 items-center justify-center rounded-full text-xs",
                    isEqual(day, selectedDay) &&
                      isToday(day) &&
                      "bg-teal-500 text-white",
                    isEqual(day, selectedDay) &&
                      !isToday(day) &&
                      "bg-purple-500 text-white",
                    !isEqual(day, selectedDay) &&
                      isToday(day) &&
                      "bg-teal-500 text-white",
                  )}
                >
                  {format(day, "d")}
                </time>
                {data.filter((date) => isSameDay(date.day, day)).length > 0 && (
                  <div>
                    {data
                      .filter((date) => isSameDay(date.day, day))
                      .map((date) => (
                        <div
                          key={date.day.toString()}
                          className="-mx-0.5 mt-auto flex flex-wrap-reverse"
                        >
                          {date.events.map((event) => {
                            const color = getEventColor(event);
                            return (
                              <span
                                key={event.id}
                                className={cn(
                                  "mx-0.5 mt-1 h-1.5 w-1.5 rounded-full",
                                  color.dot,
                                )}
                              />
                            );
                          })}
                        </div>
                      ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
