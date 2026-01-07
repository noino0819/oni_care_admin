'use client';

// ============================================
// 기능성 성분 등록/수정 모달
// ============================================

import { useState, useEffect } from 'react';
import { Modal, Button, AlertModal } from '@/components/common';
import {
  useFunctionalIngredientDetail,
  useCreateFunctionalIngredient,
  useUpdateFunctionalIngredient,
} from '@/hooks/useFunctionalIngredients';
import { useDosageUnits } from '@/hooks/useUnits';

interface FunctionalIngredientFormModalProps {
  ingredientId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function FunctionalIngredientFormModal({
  ingredientId,
  isOpen,
  onClose,
  onSaved,
}: FunctionalIngredientFormModalProps) {
  const isEdit = !!ingredientId;
  const { ingredient, isLoading: isLoadingDetail } = useFunctionalIngredientDetail(ingredientId);
  const { createIngredient, isCreating } = useCreateFunctionalIngredient();
  const { updateIngredient, isUpdating } = useUpdateFunctionalIngredient(ingredientId);
  const { units: dosageUnits } = useDosageUnits();

  // 폼 상태
  const [formData, setFormData] = useState({
    internal_name: '',
    external_name: '',
    indicator_component: '',
    daily_intake_min: '',
    daily_intake_max: '',
    daily_intake_unit: 'mg',
    display_functionality: '',
    is_active: true,
    priority_display: false,
  });

  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // 수정 모드일 때 데이터 로드
  useEffect(() => {
    if (isEdit && ingredient) {
      setFormData({
        internal_name: ingredient.internal_name || '',
        external_name: ingredient.external_name || '',
        indicator_component: ingredient.indicator_component || '',
        daily_intake_min: ingredient.daily_intake_min?.toString() || '',
        daily_intake_max: ingredient.daily_intake_max?.toString() || '',
        daily_intake_unit: ingredient.daily_intake_unit || 'mg',
        display_functionality: ingredient.display_functionality || '',
        is_active: ingredient.is_active ?? true,
        priority_display: ingredient.priority_display ?? false,
      });
    } else if (!isEdit) {
      // 신규 등록 시 초기화
      setFormData({
        internal_name: '',
        external_name: '',
        indicator_component: '',
        daily_intake_min: '',
        daily_intake_max: '',
        daily_intake_unit: 'mg',
        display_functionality: '',
        is_active: true,
        priority_display: false,
      });
    }
  }, [isEdit, ingredient]);

  const handleChange = (key: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    // 유효성 검사
    if (!formData.internal_name.trim()) {
      setAlertMessage('기능성 성분명(내부)을 입력해주세요.');
      return;
    }

    if (formData.internal_name.trim().length > 30) {
      setAlertMessage('기능성 성분명(내부)은 30자 이내로 입력해주세요.');
      return;
    }

    if (!formData.external_name.trim()) {
      setAlertMessage('기능성 성분명(외부)을 입력해주세요.');
      return;
    }

    if (formData.external_name.trim().length > 30) {
      setAlertMessage('기능성 성분명(외부)은 30자 이내로 입력해주세요.');
      return;
    }

    try {
      const payload = {
        internal_name: formData.internal_name.trim(),
        external_name: formData.external_name.trim(),
        indicator_component: formData.indicator_component.trim() || null,
        daily_intake_min: formData.daily_intake_min ? parseFloat(formData.daily_intake_min) : null,
        daily_intake_max: formData.daily_intake_max ? parseFloat(formData.daily_intake_max) : null,
        daily_intake_unit: formData.daily_intake_unit || 'mg',
        display_functionality: formData.display_functionality.trim() || null,
        is_active: formData.is_active,
        priority_display: formData.priority_display,
      };

      if (isEdit) {
        await updateIngredient(payload);
      } else {
        await createIngredient(payload);
      }
      onSaved();
    } catch {
      setAlertMessage('저장 중 오류가 발생했습니다.');
    }
  };

  const inputClass = 'h-[32px] px-3 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] placeholder:text-gray-400';
  const selectClass = 'h-[32px] px-3 border border-gray-300 rounded text-[13px] bg-white appearance-none focus:outline-none focus:border-[#666] select-arrow';
  const labelClass = 'text-[13px] font-medium text-[#333] w-[130px] flex-shrink-0';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEdit ? '기능성 성분 수정' : '기능성 성분 등록'}
        size="md"
      >
        {isLoadingDetail && isEdit ? (
          <div className="py-8 text-center text-gray-500">로딩 중...</div>
        ) : (
          <div className="space-y-4 py-2">
            {/* 기능성 성분명(내부) */}
            <div className="flex items-center gap-3">
              <span className={labelClass}>
                성분명(내부) <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                value={formData.internal_name}
                onChange={(e) => handleChange('internal_name', e.target.value)}
                className={`${inputClass} flex-1`}
                placeholder="내부 사용 성분명 입력 (30자 이내)"
                maxLength={30}
              />
            </div>

            {/* 기능성 성분명(외부) */}
            <div className="flex items-center gap-3">
              <span className={labelClass}>
                성분명(외부) <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                value={formData.external_name}
                onChange={(e) => handleChange('external_name', e.target.value)}
                className={`${inputClass} flex-1`}
                placeholder="외부 노출 성분명 입력 (30자 이내)"
                maxLength={30}
              />
            </div>

            {/* 지표성분 */}
            <div className="flex items-center gap-3">
              <span className={labelClass}>지표성분</span>
              <input
                type="text"
                value={formData.indicator_component}
                onChange={(e) => handleChange('indicator_component', e.target.value)}
                className={`${inputClass} flex-1`}
                placeholder="지표성분명 입력 (30자 이내)"
                maxLength={30}
              />
            </div>

            {/* 일일 섭취량 하한 + 상한 */}
            <div className="flex items-center gap-3">
              <span className={labelClass}>일일섭취량(하한)</span>
              <input
                type="number"
                value={formData.daily_intake_min}
                onChange={(e) => handleChange('daily_intake_min', e.target.value)}
                className={`${inputClass} w-[100px]`}
                placeholder="숫자"
              />
              <span className="text-[13px] text-[#333]">~</span>
              <span className="text-[13px] text-[#333]">상한</span>
              <input
                type="number"
                value={formData.daily_intake_max}
                onChange={(e) => handleChange('daily_intake_max', e.target.value)}
                className={`${inputClass} w-[100px]`}
                placeholder="숫자"
              />
              <select
                value={formData.daily_intake_unit}
                onChange={(e) => handleChange('daily_intake_unit', e.target.value)}
                className={`${selectClass} w-[80px]`}
              >
                {dosageUnits.map(unit => (
                  <option key={unit.id} value={unit.unit_value}>{unit.unit_value}</option>
                ))}
              </select>
            </div>

            {/* 기능성 표시내용 */}
            <div className="flex items-start gap-3">
              <span className={`${labelClass} pt-2`}>기능성 표시내용</span>
              <textarea
                value={formData.display_functionality}
                onChange={(e) => handleChange('display_functionality', e.target.value)}
                className="flex-1 p-3 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] placeholder:text-gray-400 resize-none"
                placeholder="기능성 표시내용 전문 (참고용)"
                rows={4}
              />
            </div>

            {/* 사용여부 + 우선노출 */}
            <div className="flex items-center gap-3">
              <span className={labelClass}>사용여부</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  className="w-4 h-4 border border-gray-300 rounded accent-[#737373]"
                />
                <span className="text-[13px] text-[#333]">사용</span>
              </label>
              <span className="text-[13px] text-[#333] ml-6">우선노출</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.priority_display}
                  onChange={(e) => handleChange('priority_display', e.target.checked)}
                  className="w-4 h-4 border border-gray-300 rounded accent-[#737373]"
                />
                <span className="text-[13px] text-[#333]">Y</span>
              </label>
            </div>

            {/* 버튼 */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="secondary" onClick={onClose}>
                취소
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isCreating || isUpdating}
              >
                {isCreating || isUpdating ? '저장 중...' : '저장'}
              </Button>
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

