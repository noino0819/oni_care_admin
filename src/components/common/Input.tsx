'use client';

// ============================================
// 공통 입력 필드 컴포넌트 - Figma 디자인 동일
// ============================================

import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  labelWidth?: string;
  inputWidth?: string;
  horizontal?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, labelWidth, inputWidth, horizontal = false, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

    if (horizontal) {
      return (
        <div className="flex items-center gap-4">
          {label && (
            <label
              htmlFor={inputId}
              className={cn(
                "text-[20px] font-bold text-black whitespace-nowrap",
                labelWidth
              )}
            >
              {label}
              {props.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'h-[30px] px-3 border border-[#d6d4d4] rounded-[5px] text-[14px] bg-white',
              'focus:outline-none focus:border-[#737373]',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              'placeholder:text-[#a5a5a5]',
              error ? 'border-red-500' : 'border-[#d6d4d4]',
              inputWidth || 'w-[247px]',
              className
            )}
            {...props}
          />
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
            htmlFor={inputId}
            className="block text-[20px] font-bold text-black mb-2"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full h-[30px] px-3 border border-[#d6d4d4] rounded-[5px] text-[14px] bg-white',
            'focus:outline-none focus:border-[#737373]',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            'placeholder:text-[#a5a5a5]',
            error ? 'border-red-500' : 'border-[#d6d4d4]',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
