'use client';

// ============================================
// 영양제 등록/수정 모달
// ============================================

import { useState, useEffect } from 'react';
import { Modal, Button, AlertModal } from '@/components/common';
import { useSupplementDetail, useCreateSupplement, useUpdateSupplement } from '@/hooks/useSupplements';
import type { UnitCode } from '@/hooks/useUnits';

interface SupplementFormModalProps {
  supplementId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  formUnits: UnitCode[];
  dosageUnits: UnitCode[];
}

export function SupplementFormModal({
  supplementId,
  isOpen,
  onClose,
  onSaved,
  formUnits,
  dosageUnits,
}: SupplementFormModalProps) {
  const isEdit = !!supplementId;
  const { supplement, isLoading: isLoadingDetail } = useSupplementDetail(supplementId);
  const { createSupplement, isCreating } = useCreateSupplement();
  const { updateSupplement, isUpdating } = useUpdateSupplement(supplementId);

  // 폼 상태
  const [formData, setFormData] = useState({
    product_report_number: '',
    product_name: '',
    product_form: '',
    dosage: '',
    dosage_unit: 'mg',
    intake_method: '',
    default_intake_time: '09:00',
    default_intake_amount: '1',
    default_intake_unit: '정',
    manufacturer: '',
    is_active: true,
  });

  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // 수정 모드일 때 데이터 로드
  useEffect(() => {
    if (isEdit && supplement) {
      setFormData({
        product_report_number: supplement.product_report_number || '',
        product_name: supplement.product_name || '',
        product_form: supplement.product_form || '',
        dosage: supplement.dosage?.toString() || '',
        dosage_unit: supplement.dosage_unit || 'mg',
        intake_method: supplement.intake_method || '',
        default_intake_time: supplement.default_intake_time || '09:00',
        default_intake_amount: supplement.default_intake_amount?.toString() || '1',
        default_intake_unit: supplement.default_intake_unit || '정',
        manufacturer: supplement.manufacturer || '',
        is_active: supplement.is_active ?? true,
      });
    } else if (!isEdit) {
      // 신규 등록 시 초기화
      setFormData({
        product_report_number: '',
        product_name: '',
        product_form: '',
        dosage: '',
        dosage_unit: 'mg',
        intake_method: '',
        default_intake_time: '00:00',
        default_intake_amount: '1',
        default_intake_unit: '정',
        manufacturer: '',
        is_active: true,
      });
    }
  }, [isEdit, supplement]);

  const handleChange = (key: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    // 유효성 검사
    if (!formData.product_name.trim()) {
      setAlertMessage('영양제명을 입력해주세요.');
      return;
    }

    if (formData.product_name.trim().length > 30) {
      setAlertMessage('영양제명은 30자 이내로 입력해주세요.');
      return;
    }

    try {
      const payload = {
        product_report_number: formData.product_report_number || null,
        product_name: formData.product_name.trim(),
        product_form: formData.product_form || null,
        dosage: formData.dosage ? parseFloat(formData.dosage) : null,
        dosage_unit: formData.dosage_unit || 'mg',
        intake_method: formData.intake_method || null,
        default_intake_time: formData.default_intake_time || '09:00',
        default_intake_amount: formData.default_intake_amount ? parseFloat(formData.default_intake_amount) : 1,
        default_intake_unit: formData.default_intake_unit || '정',
        manufacturer: formData.manufacturer || null,
        is_active: formData.is_active,
      };

      if (isEdit) {
        await updateSupplement(payload);
      } else {
        await createSupplement(payload);
      }
      onSaved();
    } catch {
      setAlertMessage('저장 중 오류가 발생했습니다.');
    }
  };

  const inputClass = 'h-[32px] px-3 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] placeholder:text-gray-400';
  const selectClass = 'h-[32px] px-3 border border-gray-300 rounded text-[13px] bg-white appearance-none focus:outline-none focus:border-[#666] select-arrow';
  const labelClass = 'text-[13px] font-medium text-[#333] w-[120px] flex-shrink-0';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEdit ? '영양제 수정' : '영양제 등록'}
        size="md"
      >
        {isLoadingDetail && isEdit ? (
          <div className="py-8 text-center text-gray-500">로딩 중...</div>
        ) : (
          <div className="space-y-4 py-2">
            {/* 품목제조보고번호 */}
            <div className="flex items-center gap-3">
              <span className={labelClass}>품목제조보고번호</span>
              <input
                type="text"
                value={formData.product_report_number}
                onChange={(e) => handleChange('product_report_number', e.target.value)}
                className={`${inputClass} flex-1`}
                placeholder="품목제조보고번호 입력"
              />
            </div>

            {/* 영양제명 */}
            <div className="flex items-center gap-3">
              <span className={labelClass}>
                영양제명 <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) => handleChange('product_name', e.target.value)}
                className={`${inputClass} flex-1`}
                placeholder="영양제명 입력 (30자 이내)"
                maxLength={30}
              />
            </div>

            {/* 제품형태 + 용량 */}
            <div className="flex items-center gap-3">
              <span className={labelClass}>제품형태</span>
              <select
                value={formData.product_form}
                onChange={(e) => handleChange('product_form', e.target.value)}
                className={`${selectClass} w-[100px]`}
              >
                <option value="">선택</option>
                {formUnits.map(unit => (
                  <option key={unit.id} value={unit.unit_value}>{unit.unit_name}</option>
                ))}
              </select>
              <span className="text-[13px] text-[#333] ml-4">용량</span>
              <input
                type="number"
                value={formData.dosage}
                onChange={(e) => handleChange('dosage', e.target.value)}
                className={`${inputClass} w-[80px]`}
                placeholder="숫자"
              />
              <select
                value={formData.dosage_unit}
                onChange={(e) => handleChange('dosage_unit', e.target.value)}
                className={`${selectClass} w-[80px]`}
              >
                {dosageUnits.map(unit => (
                  <option key={unit.id} value={unit.unit_value}>{unit.unit_name}</option>
                ))}
              </select>
            </div>

            {/* 섭취방법 */}
            <div className="flex items-center gap-3">
              <span className={labelClass}>섭취방법</span>
              <input
                type="text"
                value={formData.intake_method}
                onChange={(e) => handleChange('intake_method', e.target.value)}
                className={`${inputClass} flex-1`}
                placeholder="예: 1일 2회, 1회 1정을 물과 함께 섭취"
              />
            </div>

            {/* 기본 섭취시간 + 기본 섭취량 */}
            <div className="flex items-center gap-3">
              <span className={labelClass}>기본 섭취시간</span>
              <input
                type="time"
                value={formData.default_intake_time}
                onChange={(e) => handleChange('default_intake_time', e.target.value)}
                className={`${inputClass} w-[120px]`}
              />
              <span className="text-[13px] text-[#333] ml-4">기본 섭취량</span>
              <input
                type="number"
                value={formData.default_intake_amount}
                onChange={(e) => handleChange('default_intake_amount', e.target.value)}
                className={`${inputClass} w-[80px]`}
                placeholder="숫자"
              />
              <select
                value={formData.default_intake_unit}
                onChange={(e) => handleChange('default_intake_unit', e.target.value)}
                className={`${selectClass} w-[80px]`}
              >
                {dosageUnits.map(unit => (
                  <option key={unit.id} value={unit.unit_value}>{unit.unit_name}</option>
                ))}
              </select>
            </div>

            {/* 제조사 */}
            <div className="flex items-center gap-3">
              <span className={labelClass}>제조사</span>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => handleChange('manufacturer', e.target.value)}
                className={`${inputClass} flex-1`}
                placeholder="제조사명 입력"
              />
            </div>

            {/* 사용여부 */}
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

