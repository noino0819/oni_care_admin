'use client';

// ============================================
// 대분류 카테고리 등록/수정 모달
// ============================================

import { useState, useEffect } from 'react';
import { Modal, Button, AlertModal } from '@/components/common';
import { useCategoryDetail, createCategory, updateCategory } from '@/hooks/useCategories';
import type { CategoryForm } from '@/types';

interface CategoryFormModalProps {
  categoryId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (id: number) => void;
}

const initialForm: CategoryForm = {
  category_type: '',
  category_name: '',
  subcategory_types: '',
  display_order: 0,
  is_active: true,
};

export function CategoryFormModal({ categoryId, isOpen, onClose, onSaved, onDelete }: CategoryFormModalProps) {
  const { category, isLoading: isLoadingCategory } = useCategoryDetail(categoryId);
  const [form, setForm] = useState<CategoryForm>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const isEditing = !!categoryId;

  useEffect(() => {
    if (category && isEditing) {
      setForm({
        category_type: category.category_type,
        category_name: category.category_name,
        subcategory_types: category.subcategory_types || '',
        display_order: category.display_order,
        is_active: category.is_active,
      });
    } else if (!isEditing && isOpen) {
      setForm(initialForm);
    }
  }, [category, isEditing, isOpen]);

  const handleChange = (key: keyof CategoryForm, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.category_type.trim()) {
      setAlertMessage('카테고리 유형을 입력해주세요.');
      return;
    }
    if (!form.category_name.trim()) {
      setAlertMessage('대분류명을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing && categoryId) {
        await updateCategory(categoryId, form);
      } else {
        await createCategory(form);
      }
      onSaved();
    } catch {
      setAlertMessage('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = 'h-[34px] px-3 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-[#666]';
  const labelClass = 'text-[13px] font-semibold text-[#333] w-[100px] flex-shrink-0';
  const checkboxClass = 'w-4 h-4 border border-gray-300 rounded cursor-pointer accent-[#737373]';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? '대분류 카테고리 수정' : '대분류 카테고리 등록'}
        size="sm"
      >
        {isLoadingCategory ? (
          <div className="py-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C8E600]" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* 카테고리 유형 */}
            <div className="flex items-center gap-2">
              <span className={labelClass}>카테고리 유형 <span className="text-red-500">*</span></span>
              <input
                type="text"
                value={form.category_type}
                onChange={(e) => handleChange('category_type', e.target.value)}
                className={`${inputClass} flex-1`}
                placeholder="예: health, lifestyle"
              />
            </div>

            {/* 대분류명 */}
            <div className="flex items-center gap-2">
              <span className={labelClass}>대분류명 <span className="text-red-500">*</span></span>
              <input
                type="text"
                value={form.category_name}
                onChange={(e) => handleChange('category_name', e.target.value)}
                className={`${inputClass} flex-1`}
                placeholder="예: 건강정보, 라이프스타일"
              />
            </div>

            {/* 중분류 유형 */}
            <div className="flex items-center gap-2">
              <span className={labelClass}>중분류 유형</span>
              <input
                type="text"
                value={form.subcategory_types}
                onChange={(e) => handleChange('subcategory_types', e.target.value)}
                className={`${inputClass} flex-1`}
                placeholder="예: disease, symptom (쉼표로 구분)"
              />
            </div>

            {/* 표시순서 */}
            <div className="flex items-center gap-2">
              <span className={labelClass}>표시순서</span>
              <input
                type="number"
                value={form.display_order}
                onChange={(e) => handleChange('display_order', parseInt(e.target.value) || 0)}
                className={`${inputClass} w-[100px]`}
                min={0}
              />
            </div>

            {/* 사용여부 */}
            <div className="flex items-center gap-2">
              <span className={labelClass}>사용여부</span>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  className={checkboxClass}
                />
                <span className="text-[13px] text-[#333]">사용</span>
              </label>
            </div>

            {/* 버튼 */}
            <div className="flex justify-between pt-4">
              {isEditing ? (
                <Button
                  variant="secondary"
                  onClick={() => categoryId && onDelete(categoryId)}
                  className="text-red-500"
                >
                  삭제
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose} className="min-w-[80px]">
                  취소
                </Button>
                <Button onClick={handleSubmit} disabled={isSaving} className="min-w-[80px]">
                  {isSaving ? '저장 중...' : '저장'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <AlertModal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        message={alertMessage || ''}
      />
    </>
  );
}

