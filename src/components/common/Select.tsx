'use client';

// ============================================
// 공통 셀렉트 컴포넌트 - Figma 디자인 동일
// ============================================

import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  onChange?: (value: string) => void;
  selectWidth?: string;
  horizontal?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, onChange, id, value, selectWidth, horizontal = false, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s/g, '-');

    if (horizontal) {
      return (
        <div className="flex items-center gap-4">
          {label && (
            <label
              htmlFor={selectId}
              className="text-[20px] font-bold text-black whitespace-nowrap"
            >
              {label}
              {props.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
          <div className="relative">
            <select
              ref={ref}
              id={selectId}
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              className={cn(
                'h-[30px] px-3 border border-[#d6d4d4] rounded-[5px] text-[14px] bg-white appearance-none',
                'focus:outline-none focus:border-[#737373]',
                'disabled:bg-gray-100 disabled:cursor-not-allowed',
                error ? 'border-red-500' : 'border-[#d6d4d4]',
                'select-arrow',
                selectWidth || 'w-[247px]',
                className
              )}
              {...props}
            >
              {placeholder && (
                <option value="" disabled>
                  {placeholder}
                </option>
              )}
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>
      );
    }

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-[20px] font-bold text-black mb-2"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className={cn(
              'w-full h-[30px] px-3 border border-[#d6d4d4] rounded-[5px] text-[14px] bg-white appearance-none',
              'focus:outline-none focus:border-[#737373]',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              error ? 'border-red-500' : 'border-[#d6d4d4]',
              'select-arrow',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
