'use client';

// ============================================
// 공지사항 등록/수정 모달 - 기획서 스펙 반영
// ============================================

import { useState, useEffect } from 'react';
import { Modal, Button, AlertModal } from '@/components/common';
import { useNoticeDetail, createNotice, updateNotice } from '@/hooks/useNotices';
import { formatDate } from '@/lib/utils';
import type { NoticeForm } from '@/types';

interface NoticeFormModalProps {
  noticeId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// 공개범위 옵션
const VISIBILITY_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'normal', label: '일반회원' },
  { value: 'affiliate', label: '제휴사' },
  { value: 'fs', label: 'FS' },
];

const initialForm: NoticeForm = {
  title: '',
  content: '',
  image_url: null,
  visibility_scope: ['all'],
  company_codes: [],
  store_visible: false,
  start_date: '',
  end_date: '',
};

export function NoticeFormModal({ noticeId, isOpen, onClose, onSaved }: NoticeFormModalProps) {
  const { notice, isLoading: isLoadingNotice } = useNoticeDetail(noticeId);
  const [form, setForm] = useState<NoticeForm>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const isEditing = !!noticeId;

  useEffect(() => {
    if (notice && isEditing) {
      setForm({
        title: notice.title,
        content: notice.content,
        image_url: notice.image_url,
        visibility_scope: notice.visibility_scope || ['all'],
        company_codes: notice.company_codes || [],
        store_visible: notice.store_visible || false,
        start_date: notice.start_date ? formatDate(notice.start_date, 'YYYY-MM-DD') : '',
        end_date: notice.end_date ? formatDate(notice.end_date, 'YYYY-MM-DD') : '',
      });
    } else if (!isEditing && isOpen) {
      setForm(initialForm);
    }
  }, [notice, isEditing, isOpen]);

  const handleChange = (key: keyof NoticeForm, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setAlertMessage('제목을 입력해주세요.');
      return;
    }
    if (!form.content.trim()) {
      setAlertMessage('내용을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing && noticeId) {
        await updateNotice(noticeId, form);
      } else {
        await createNotice(form);
      }
      onSaved();
    } catch {
      setAlertMessage('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = 'h-[34px] px-3 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-[#666]';
  const textareaClass = 'w-full px-3 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-[#666] resize-none';
  const labelClass = 'text-[13px] font-semibold text-[#333] w-[100px] flex-shrink-0';
  const checkboxClass = 'w-4 h-4 border border-gray-300 rounded cursor-pointer accent-[#737373]';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? '공지사항 수정' : '공지사항 등록'}
        size="lg"
      >
        {isLoadingNotice ? (
          <div className="py-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C8E600]" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* 기본정보 섹션 */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">기본정보</h3>
              
              {/* 제목 */}
              <div className="flex items-center gap-2 mb-3">
                <span className={labelClass}>제목 <span className="text-red-500">*</span></span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className={`${inputClass} flex-1`}
                  placeholder="공지사항 제목을 입력하세요"
                />
              </div>

              {/* 내용 */}
              <div className="flex items-start gap-2">
                <span className={labelClass}>내용 <span className="text-red-500">*</span></span>
                <textarea
                  value={form.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  className={textareaClass}
                  rows={8}
                  placeholder="공지사항 내용을 입력하세요"
                />
              </div>
            </section>

            {/* 노출설정 섹션 */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">노출설정</h3>
              
              {/* 공개범위 */}
              <div className="flex items-center gap-2 mb-3">
                <span className={labelClass}>공개범위</span>
                <div className="flex items-center gap-3">
                  {VISIBILITY_OPTIONS.map(option => (
                    <label key={option.value} className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.visibility_scope?.includes(option.value) || false}
                        onChange={(e) => {
                          const current = form.visibility_scope || [];
                          if (e.target.checked) {
                            handleChange('visibility_scope', [...current, option.value]);
                          } else {
                            handleChange('visibility_scope', current.filter(v => v !== option.value));
                          }
                        }}
                        className={checkboxClass}
                      />
                      <span className="text-[13px] text-[#333]">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 기업/사업장 코드 */}
              <div className="flex items-center gap-2 mb-3">
                <span className={labelClass}>기업/사업장코드</span>
                <input
                  type="text"
                  value={form.company_codes?.join(', ') || ''}
                  onChange={(e) => handleChange('company_codes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  className={`${inputClass} flex-1`}
                  placeholder="쉼표로 구분하여 입력"
                />
              </div>

              {/* 게시기간 */}
              <div className="flex items-center gap-2 mb-3">
                <span className={labelClass}>게시기간</span>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  className={`${inputClass} w-[140px]`}
                />
                <span className="text-gray-400">~</span>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                  className={`${inputClass} w-[140px]`}
                />
              </div>

              {/* 스토어 노출 */}
              <div className="flex items-center gap-2">
                <span className={labelClass}>스토어 노출</span>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.store_visible}
                    onChange={(e) => handleChange('store_visible', e.target.checked)}
                    className={checkboxClass}
                  />
                  <span className="text-[13px] text-[#333]">노출</span>
                </label>
              </div>
            </section>

            {/* 이미지 섹션 */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">이미지</h3>
              
              <div className="flex items-center gap-2">
                <span className={labelClass}>이미지 URL</span>
                <input
                  type="text"
                  value={form.image_url || ''}
                  onChange={(e) => handleChange('image_url', e.target.value || null)}
                  className={`${inputClass} flex-1`}
                  placeholder="이미지 URL을 입력하세요"
                />
              </div>
              {form.image_url && (
                <div className="mt-2 ml-[108px]">
                  <img
                    src={form.image_url}
                    alt="공지사항 이미지"
                    className="max-w-[200px] max-h-[150px] object-contain border rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </section>

            {/* 버튼 */}
            <div className="flex justify-center gap-3 pt-4">
              <Button variant="secondary" onClick={onClose} className="min-w-[100px]">
                취소
              </Button>
              <Button onClick={handleSubmit} disabled={isSaving} className="min-w-[100px]">
                {isSaving ? '저장 중...' : '저장'}
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

