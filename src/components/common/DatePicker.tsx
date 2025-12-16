'use client';

// ============================================
// 날짜 선택 컴포넌트
// ============================================

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';

interface DatePickerProps {
  label?: string;
  value?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

function DatePicker({
  label,
  value,
  onChange,
  placeholder = '날짜 선택',
  disabled,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value || new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // 달력 시작 요일 맞추기 (일요일부터)
  const startDay = monthStart.getDay();
  const paddingDays = Array.from({ length: startDay }, () => null);

  const handleDateSelect = (date: Date) => {
    onChange(date);
    setIsOpen(false);
  };

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'w-full px-3 py-2 border rounded-md text-sm text-left flex items-center justify-between',
            'focus:outline-none focus:ring-2 focus:ring-[#C8E600] focus:border-transparent',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            'border-gray-300 bg-white'
          )}
        >
          <span className={value ? 'text-gray-900' : 'text-gray-400'}>
            {value ? format(value, 'yyyy.MM.dd') : placeholder}
          </span>
          <Calendar className="h-4 w-4 text-gray-400" />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-72">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <span className="font-medium text-gray-900">
                {format(currentMonth, 'yyyy년 M월', { locale: ko })}
              </span>
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-gray-500 py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-1">
              {paddingDays.map((_, index) => (
                <div key={`padding-${index}`} className="h-8" />
              ))}
              {days.map((day) => (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  className={cn(
                    'h-8 rounded text-sm transition-colors',
                    !isSameMonth(day, currentMonth) && 'text-gray-300',
                    isSameMonth(day, currentMonth) && 'hover:bg-gray-100',
                    isToday(day) && 'bg-gray-100',
                    value && isSameDay(day, value) && 'bg-[#C8E600] text-black hover:bg-[#B5D000]'
                  )}
                >
                  {format(day, 'd')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 날짜 범위 선택 컴포넌트
interface DateRangePickerProps {
  label?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  disabled?: boolean;
}

function DateRangePicker({
  label,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  disabled,
}: DateRangePickerProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <DatePicker
          value={startDate}
          onChange={onStartDateChange}
          placeholder="시작일"
          disabled={disabled}
        />
        <span className="text-gray-400">~</span>
        <DatePicker
          value={endDate}
          onChange={onEndDateChange}
          placeholder="종료일"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export { DatePicker, DateRangePicker };

