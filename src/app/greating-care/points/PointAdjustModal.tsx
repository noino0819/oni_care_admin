'use client';

// ============================================
// 포인트 조정 모달 - 기획서 스펙 반영
// ============================================

import { useState } from 'react';
import { Modal, Button, AlertModal } from '@/components/common';
import { adjustPoints } from '@/hooks/usePoints';

interface PointAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface AdjustForm {
  user_id: string;
  adjustment_type: 'add' | 'subtract';
  points: number;
  reason: string;
  memo: string;
}

const initialForm: AdjustForm = {
  user_id: '',
  adjustment_type: 'add',
  points: 0,
  reason: '',
  memo: '',
};

// 조정 사유 옵션
const REASON_OPTIONS = [
  { value: 'event', label: '이벤트 보상' },
  { value: 'promotion', label: '프로모션' },
  { value: 'compensation', label: '보상/환불' },
  { value: 'correction', label: '오류 정정' },
  { value: 'admin', label: '관리자 조정' },
  { value: 'other', label: '기타' },
];

export function PointAdjustModal({ isOpen, onClose, onSaved }: PointAdjustModalProps) {
  const [form, setForm] = useState<AdjustForm>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const handleChange = (key: keyof AdjustForm, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleClose = () => {
    setForm(initialForm);
    onClose();
  };

  const handleSubmit = async () => {
    if (!form.user_id.trim()) {
      setAlertMessage('회원 ID를 입력해주세요.');
      return;
    }
    if (!form.points || form.points <= 0) {
      setAlertMessage('포인트를 입력해주세요.');
      return;
    }
    if (!form.reason) {
      setAlertMessage('조정 사유를 선택해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      await adjustPoints({
        user_id: form.user_id,
        points: form.adjustment_type === 'add' ? form.points : -form.points,
        reason: form.reason,
        memo: form.memo,
      });
      onSaved();
      handleClose();
    } catch {
      setAlertMessage('포인트 조정 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = 'h-[34px] px-3 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-[#666]';
  const selectClass = 'h-[34px] px-3 border border-gray-300 rounded text-[13px] bg-white appearance-none focus:outline-none focus:border-[#666]';
  const textareaClass = 'w-full px-3 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-[#666] resize-none';
  const labelClass = 'text-[13px] font-semibold text-[#333] w-[100px] flex-shrink-0';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="포인트 조정"
        size="sm"
      >
        <div className="space-y-4">
          {/* 회원 ID */}
          <div className="flex items-center gap-2">
            <span className={labelClass}>회원 ID <span className="text-red-500">*</span></span>
            <input
              type="text"
              value={form.user_id}
              onChange={(e) => handleChange('user_id', e.target.value)}
              className={`${inputClass} flex-1`}
              placeholder="회원 ID 또는 이메일"
            />
          </div>

          {/* 조정 유형 */}
          <div className="flex items-center gap-2">
            <span className={labelClass}>조정 유형 <span className="text-red-500">*</span></span>
            <div className="flex gap-4">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="adjustment_type"
                  checked={form.adjustment_type === 'add'}
                  onChange={() => handleChange('adjustment_type', 'add')}
                  className="w-4 h-4 accent-[#737373]"
                />
                <span className="text-[13px] text-green-600">적립 (+)</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="adjustment_type"
                  checked={form.adjustment_type === 'subtract'}
                  onChange={() => handleChange('adjustment_type', 'subtract')}
                  className="w-4 h-4 accent-[#737373]"
                />
                <span className="text-[13px] text-red-600">차감 (-)</span>
              </label>
            </div>
          </div>

          {/* 포인트 */}
          <div className="flex items-center gap-2">
            <span className={labelClass}>포인트 <span className="text-red-500">*</span></span>
            <input
              type="number"
              value={form.points || ''}
              onChange={(e) => handleChange('points', parseInt(e.target.value) || 0)}
              className={`${inputClass} w-[150px]`}
              min={1}
              placeholder="0"
            />
            <span className="text-[13px] text-gray-500">P</span>
          </div>

          {/* 조정 사유 */}
          <div className="flex items-center gap-2">
            <span className={labelClass}>조정 사유 <span className="text-red-500">*</span></span>
            <select
              value={form.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              className={`${selectClass} flex-1`}
            >
              <option value="">선택</option>
              {REASON_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* 메모 */}
          <div className="flex items-start gap-2">
            <span className={labelClass}>메모</span>
            <textarea
              value={form.memo}
              onChange={(e) => handleChange('memo', e.target.value)}
              className={textareaClass}
              rows={3}
              placeholder="조정 관련 메모"
            />
          </div>

          {/* 버튼 */}
          <div className="flex justify-center gap-3 pt-4">
            <Button variant="secondary" onClick={handleClose} className="min-w-[100px]">
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving} className="min-w-[100px]">
              {isSaving ? '처리 중...' : '확인'}
            </Button>
          </div>
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

