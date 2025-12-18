'use client';

// ============================================
// 공통 폼 모달 컴포넌트 - 기획서 디자인 참고
// ============================================

import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from './Button';

interface FormField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'toggle';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  disabled?: boolean;
}

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  fields: FormField[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

function FormModal({
  isOpen,
  onClose,
  onSave,
  title,
  fields,
  values,
  onChange,
  isLoading,
  size = 'md',
}: FormModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  const renderField = (field: FormField) => {
    const value = values[field.key];
    
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled}
            className={cn(
              'flex-1 h-[38px] px-3 border border-gray-200 rounded text-[14px] bg-white',
              'focus:outline-none focus:border-[#737373]',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              'placeholder:text-gray-400'
            )}
          />
        );
      case 'textarea':
        return (
          <textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled}
            rows={3}
            className={cn(
              'flex-1 px-3 py-2 border border-gray-200 rounded text-[14px] bg-white resize-none',
              'focus:outline-none focus:border-[#737373]',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              'placeholder:text-gray-400'
            )}
          />
        );
      case 'select':
        return (
          <select
            value={(value as string) || ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            disabled={field.disabled}
            className={cn(
              'flex-1 h-[38px] px-3 border border-gray-200 rounded text-[14px] bg-white appearance-none',
              'focus:outline-none focus:border-[#737373]',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              'select-arrow'
            )}
          >
            <option value="">선택해주세요</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      case 'toggle':
        return (
          <select
            value={value === true ? 'Y' : value === false ? 'N' : (value as string) || ''}
            onChange={(e) => {
              const v = e.target.value;
              onChange(field.key, v === 'Y' ? true : v === 'N' ? false : v);
            }}
            disabled={field.disabled}
            className={cn(
              'flex-1 h-[38px] px-3 border border-gray-200 rounded text-[14px] bg-white appearance-none',
              'focus:outline-none focus:border-[#737373]',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              'select-arrow'
            )}
          >
            <option value="">선택해주세요</option>
            <option value="Y">Y</option>
            <option value="N">N</option>
          </select>
        );
      default:
        return null;
    }
  };

  const modal = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div
        className={cn(
          'bg-white rounded-lg shadow-xl w-full mx-4',
          sizes[size]
        )}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 폼 필드 */}
        <div className="px-6 py-4 space-y-3">
          {fields.map((field) => (
            <div
              key={field.key}
              className={cn(
                'flex items-start gap-4 border border-gray-200 rounded overflow-hidden',
                field.type === 'textarea' && 'items-stretch'
              )}
            >
              <div className="w-[120px] min-h-[38px] flex items-center justify-center bg-gray-50 border-r border-gray-200 px-3 py-2">
                <span className="text-[14px] font-medium text-gray-700 text-center">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </span>
              </div>
              {renderField(field)}
            </div>
          ))}
        </div>

        {/* 버튼 */}
        <div className="flex justify-center gap-3 px-6 py-4 border-t">
          <Button
            variant="secondary"
            onClick={onClose}
            className="min-w-[100px] bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            취소하기
          </Button>
          <Button
            variant="primary"
            onClick={onSave}
            isLoading={isLoading}
            className="min-w-[100px]"
          >
            저장
          </Button>
        </div>
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(modal, document.body);
}

// 검색 조건 패널 컴포넌트
interface SearchFilterProps {
  children: ReactNode;
}

function SearchFilterPanel({ children }: SearchFilterProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {children}
      </div>
    </div>
  );
}

// 검색 필드 아이템
interface SearchFieldProps {
  label: string;
  children: ReactNode;
}

function SearchField({ label, children }: SearchFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[13px] font-semibold text-[#333] whitespace-nowrap">
        {label}
      </span>
      {children}
    </div>
  );
}

export { FormModal, SearchFilterPanel, SearchField };

