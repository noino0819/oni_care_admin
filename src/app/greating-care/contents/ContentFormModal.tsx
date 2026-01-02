'use client';

// ============================================
// 컨텐츠 등록/수정 모달 - 실제 테이블 구조에 맞춤
// ============================================

import { useState, useEffect } from 'react';
import { Modal, Button, AlertModal } from '@/components/common';
import { useContentDetail, useContentCategories, createContent, updateContent } from '@/hooks/useContents';
import type { ContentForm, ContentCategory } from '@/types';

interface ContentFormModalProps {
  contentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// 실제 테이블에 있는 필드만 사용
const initialForm: ContentForm = {
  title: '',
  content: '',
  category_ids: [],
  // 아래 필드들은 테이블에 없지만 타입 호환을 위해 유지
  tags: [],
  visibility_scope: [],
  company_codes: [],
  start_date: '',
  end_date: '',
  is_store_visible: false,
  has_quote: false,
  quote_content: '',
  quote_source: '',
};

export function ContentFormModal({ contentId, isOpen, onClose, onSaved }: ContentFormModalProps) {
  const { content, isLoading: isLoadingContent } = useContentDetail(contentId);
  const { categories } = useContentCategories();
  const [form, setForm] = useState<ContentForm>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const isEditing = !!contentId;

  // contentId가 변경되거나 모달이 열릴 때 form 초기화
  useEffect(() => {
    if (!isOpen) return;
    setForm(initialForm);
  }, [contentId, isOpen]);

  // 컨텐츠 데이터가 로드되면 form에 반영
  useEffect(() => {
    if (!isOpen || !isEditing) return;
    
    if (content) {
      setForm({
        ...initialForm,
        title: content.title || '',
        content: content.content || '',
        category_ids: content.category_ids || [],
      });
    }
  }, [content, isEditing, isOpen]);

  const handleChange = (key: keyof ContentForm, value: unknown) => {
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
      if (isEditing && contentId) {
        await updateContent(contentId, form);
      } else {
        await createContent(form);
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
        title={isEditing ? '컨텐츠 수정' : '컨텐츠 등록'}
        size="lg"
      >
        {isLoadingContent ? (
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
                  placeholder="컨텐츠 제목을 입력하세요"
                />
              </div>

              {/* 카테고리 */}
              <div className="flex items-start gap-2 mb-3">
                <span className={labelClass}>카테고리</span>
                <div className="flex-1 flex flex-wrap gap-2">
                  {categories?.map((cat: ContentCategory) => (
                    <label key={cat.id} className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.category_ids?.includes(cat.id) || false}
                        onChange={(e) => {
                          const current = form.category_ids || [];
                          if (e.target.checked) {
                            handleChange('category_ids', [...current, cat.id]);
                          } else {
                            handleChange('category_ids', current.filter(id => id !== cat.id));
                          }
                        }}
                        className={checkboxClass}
                      />
                      <span className="text-[13px] text-[#333]">{cat.category_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 내용 */}
              <div className="flex items-start gap-2">
                <span className={labelClass}>내용 <span className="text-red-500">*</span></span>
                <textarea
                  value={form.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  className={textareaClass}
                  rows={12}
                  placeholder="컨텐츠 내용을 입력하세요"
                />
              </div>
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
