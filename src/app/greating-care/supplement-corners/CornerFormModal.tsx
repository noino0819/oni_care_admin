'use client';

// ============================================
// 코너 등록/수정 모달
// ============================================

import { useState, useEffect } from 'react';
import { Modal, AlertModal } from '@/components/common';
import { Button } from '@/components/common';
import { useCreateCorner, useUpdateCorner, type SupplementCorner } from '@/hooks/useSupplementCorners';

interface CornerFormModalProps {
  corner: SupplementCorner | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function CornerFormModal({ corner, isOpen, onClose, onSaved }: CornerFormModalProps) {
  const [formData, setFormData] = useState({
    corner_name: '',
    description: '',
    display_order: 999,
    is_active: true,
  });
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const { createCorner, isCreating } = useCreateCorner();
  const { updateCorner, isUpdating } = useUpdateCorner();

  const isEdit = !!corner;
  const isProcessing = isCreating || isUpdating;

  // 초기값 설정
  useEffect(() => {
    if (corner) {
      setFormData({
        corner_name: corner.corner_name || '',
        description: corner.description || '',
        display_order: corner.display_order || 999,
        is_active: corner.is_active ?? true,
      });
    } else {
      setFormData({
        corner_name: '',
        description: '',
        display_order: 999,
        is_active: true,
      });
    }
  }, [corner, isOpen]);

  const handleChange = (key: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    // 유효성 검사
    if (!formData.corner_name.trim()) {
      setAlertMessage('코너명을 입력해주세요.');
      return;
    }
    if (formData.corner_name.length > 30) {
      setAlertMessage('코너명은 30자 이내로 입력해주세요.');
      return;
    }
    if (formData.description && formData.description.length > 50) {
      setAlertMessage('설명은 50자 이내로 입력해주세요.');
      return;
    }

    try {
      if (isEdit && corner) {
        await updateCorner(corner.id, formData);
      } else {
        await createCorner(formData);
      }
      onSaved();
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err.message?.includes('순위')) {
        setAlertMessage('이미 존재하는 순위입니다.\n다시 확인해주세요.');
      } else {
        setAlertMessage('저장 중 오류가 발생했습니다.');
      }
    }
  };

  const inputClass = 'w-full h-[36px] px-3 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666]';
  const labelClass = 'text-[13px] font-semibold text-[#333] w-[100px] flex-shrink-0';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEdit ? '코너 수정' : '코너 등록'}
        size="md"
      >
        <div className="space-y-4 p-4">
          {/* 코너명 */}
          <div className="flex items-center gap-4">
            <span className={labelClass}>코너명 <span className="text-red-500">*</span></span>
            <input
              type="text"
              value={formData.corner_name}
              onChange={(e) => handleChange('corner_name', e.target.value)}
              className={inputClass}
              placeholder="코너명 (30자 이내)"
              maxLength={30}
            />
          </div>

          {/* 설명 */}
          <div className="flex items-center gap-4">
            <span className={labelClass}>설명</span>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className={inputClass}
              placeholder="설명 (50자 이내)"
              maxLength={50}
            />
          </div>

          {/* 사용여부 */}
          <div className="flex items-center gap-4">
            <span className={labelClass}>사용여부</span>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.is_active === true}
                  onChange={() => handleChange('is_active', true)}
                  className="w-4 h-4 accent-[#737373]"
                />
                <span className="text-[13px]">Y</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.is_active === false}
                  onChange={() => handleChange('is_active', false)}
                  className="w-4 h-4 accent-[#737373]"
                />
                <span className="text-[13px]">N</span>
              </label>
            </div>
          </div>

          {/* 노출 우선순위 */}
          <div className="flex items-center gap-4">
            <span className={labelClass}>노출 우선순위</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => handleChange('display_order', parseInt(e.target.value) || 999)}
                className={`${inputClass} w-[100px]`}
                placeholder="999"
                min={1}
              />
              <span className="text-[12px] text-gray-500">
                숫자가 낮을수록 상위 노출 (기본값: 999)
              </span>
            </div>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <Button variant="secondary" onClick={onClose} disabled={isProcessing}>
            취소하기
          </Button>
          <Button onClick={handleSubmit} disabled={isProcessing}>
            {isProcessing ? '저장 중...' : '저장'}
          </Button>
        </div>
      </Modal>

      <AlertModal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        message={alertMessage || ''}
      />
    </>
  );
}

