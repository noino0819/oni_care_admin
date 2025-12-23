'use client';

// ============================================
// 중분류 카테고리 등록/수정 모달
// ============================================

import { useState, useEffect } from 'react';
import { Modal, Button, AlertModal } from '@/components/common';
import { useSubcategoryDetail, createSubcategory, updateSubcategory, useCategoriesList } from '@/hooks/useCategories';
import type { SubcategoryForm, ContentCategory } from '@/types';

interface SubcategoryFormModalProps {
  subcategoryId: number | null;
  parentCategoryId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (id: number) => void;
}

const initialForm: SubcategoryForm = {
  category_id: 0,
  subcategory_name: '',
  display_order: 0,
  is_active: true,
};

export function SubcategoryFormModal({ 
  subcategoryId, 
  parentCategoryId, 
  isOpen, 
  onClose, 
  onSaved, 
  onDelete 
}: SubcategoryFormModalProps) {
  const { subcategory, isLoading: isLoadingSubcategory } = useSubcategoryDetail(subcategoryId);
  const { categories } = useCategoriesList();
  const [form, setForm] = useState<SubcategoryForm>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const isEditing = !!subcategoryId;

  useEffect(() => {
    if (subcategory && isEditing) {
      setForm({
        category_id: subcategory.category_id,
        subcategory_name: subcategory.subcategory_name,
        display_order: subcategory.display_order,
        is_active: subcategory.is_active,
      });
    } else if (!isEditing && isOpen) {
      setForm({
        ...initialForm,
        category_id: parentCategoryId || 0,
      });
    }
  }, [subcategory, isEditing, isOpen, parentCategoryId]);

  const handleChange = (key: keyof SubcategoryForm, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.category_id) {
      setAlertMessage('대분류를 선택해주세요.');
      return;
    }
    if (!form.subcategory_name.trim()) {
      setAlertMessage('중분류명을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing && subcategoryId) {
        await updateSubcategory(subcategoryId, form);
      } else {
        await createSubcategory(form);
      }
      onSaved();
    } catch {
      setAlertMessage('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = 'h-[34px] px-3 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-[#666]';
  const selectClass = 'h-[34px] px-3 border border-gray-300 rounded text-[13px] bg-white appearance-none focus:outline-none focus:border-[#666]';
  const labelClass = 'text-[13px] font-semibold text-[#333] w-[100px] flex-shrink-0';
  const checkboxClass = 'w-4 h-4 border border-gray-300 rounded cursor-pointer accent-[#737373]';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? '중분류 카테고리 수정' : '중분류 카테고리 등록'}
        size="sm"
      >
        {isLoadingSubcategory ? (
          <div className="py-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C8E600]" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* 대분류 선택 */}
            <div className="flex items-center gap-2">
              <span className={labelClass}>대분류 <span className="text-red-500">*</span></span>
              <select
                value={form.category_id}
                onChange={(e) => handleChange('category_id', parseInt(e.target.value) || 0)}
                className={`${selectClass} flex-1`}
                disabled={isEditing}
              >
                <option value={0}>선택</option>
                {categories.map((cat: ContentCategory) => (
                  <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                ))}
              </select>
            </div>

            {/* 중분류명 */}
            <div className="flex items-center gap-2">
              <span className={labelClass}>중분류명 <span className="text-red-500">*</span></span>
              <input
                type="text"
                value={form.subcategory_name}
                onChange={(e) => handleChange('subcategory_name', e.target.value)}
                className={`${inputClass} flex-1`}
                placeholder="예: 당뇨, 고혈압"
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
                  onClick={() => subcategoryId && onDelete(subcategoryId)}
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

