'use client';

// ============================================
// 공통 모달 컴포넌트
// ============================================

import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  showCloseButton?: boolean;
}

function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
}: ModalProps) {
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
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
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
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b">
            {title && (
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(modal, document.body);
}

// 알럿 모달 (확인 버튼만)
interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  confirmText?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
}

function AlertModal({
  isOpen,
  onClose,
  message,
  confirmText = '확인',
}: AlertModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false}>
      <div className="text-center py-4">
        <p className="text-gray-900 font-medium whitespace-pre-line">{message}</p>
        <div className="mt-6">
          <Button variant="secondary" onClick={onClose} className="min-w-24">
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// 확인/취소 모달
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
  title?: string;
  cancelText?: string;
  confirmText?: string;
}

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  message,
  cancelText = '취소',
  confirmText = '나가기',
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false}>
      <div className="text-center py-4">
        <p className="text-gray-900 font-medium whitespace-pre-line">{message}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={onClose} className="min-w-24">
            {cancelText}
          </Button>
          <Button variant="secondary" onClick={onConfirm} className="min-w-24">
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export { Modal, AlertModal, ConfirmModal };

