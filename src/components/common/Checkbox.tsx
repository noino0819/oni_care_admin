'use client';

// ============================================
// 공통 체크박스 컴포넌트 - Figma 디자인 동일
// ============================================

import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

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
          'inline-flex items-center cursor-pointer gap-[6px]',
          props.disabled && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          className="custom-checkbox"
          {...props}
        />
        {label && (
          <span className="text-[14px] text-black">{label}</span>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

// 체크박스 그룹 컴포넌트 - Figma 디자인 동일
interface CheckboxGroupProps {
  label?: string;
  options: { value: string; label: string }[];
  values: string[];
  onChange: (values: string[]) => void;
  includeAll?: boolean;
  allLabel?: string;
  horizontal?: boolean;
}

function CheckboxGroup({
  label,
  options,
  values,
  onChange,
  includeAll = true,
  allLabel = '전체',
  horizontal = false,
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

  if (horizontal) {
    return (
      <div className="flex items-center gap-4">
        {label && (
          <span className="text-[20px] font-bold text-black whitespace-nowrap">
            {label}
          </span>
        )}
        <div className="flex items-center gap-3">
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

  return (
    <div className="w-full">
      {label && (
        <span className="block text-[20px] font-bold text-black mb-2">
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-3">
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
