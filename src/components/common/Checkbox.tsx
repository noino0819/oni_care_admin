'use client';

// ============================================
// 공통 체크박스 컴포넌트
// ============================================

import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string;
  onChange?: (checked: boolean) => void;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, checked, onChange, id, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s/g, '-');

    return (
      <label
        htmlFor={checkboxId}
        className={cn(
          'inline-flex items-center cursor-pointer',
          props.disabled && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            checked={checked}
            onChange={(e) => onChange?.(e.target.checked)}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              'w-4 h-4 border rounded flex items-center justify-center transition-colors',
              'peer-focus:ring-2 peer-focus:ring-[#C8E600] peer-focus:ring-offset-1',
              checked
                ? 'bg-[#C8E600] border-[#C8E600]'
                : 'bg-white border-gray-300'
            )}
          >
            {checked && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
          </div>
        </div>
        {label && (
          <span className="ml-2 text-sm text-gray-700">{label}</span>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

// 체크박스 그룹 컴포넌트
interface CheckboxGroupProps {
  label?: string;
  options: { value: string; label: string }[];
  values: string[];
  onChange: (values: string[]) => void;
  includeAll?: boolean;
  allLabel?: string;
}

function CheckboxGroup({
  label,
  options,
  values,
  onChange,
  includeAll = true,
  allLabel = '전체',
}: CheckboxGroupProps) {
  const allSelected = values.length === options.length;

  const handleAllChange = (checked: boolean) => {
    if (checked) {
      onChange(options.map((opt) => opt.value));
    } else {
      onChange([]);
    }
  };

  const handleItemChange = (value: string, checked: boolean) => {
    if (checked) {
      onChange([...values, value]);
    } else {
      onChange(values.filter((v) => v !== value));
    }
  };

  return (
    <div className="w-full">
      {label && (
        <span className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-4">
        {includeAll && (
          <Checkbox
            label={allLabel}
            checked={allSelected}
            onChange={handleAllChange}
          />
        )}
        {options.map((option) => (
          <Checkbox
            key={option.value}
            label={option.label}
            checked={values.includes(option.value)}
            onChange={(checked) => handleItemChange(option.value, checked)}
          />
        ))}
      </div>
    </div>
  );
}

export { Checkbox, CheckboxGroup };

