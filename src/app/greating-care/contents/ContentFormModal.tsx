'use client';

// ============================================
// 컨텐츠 등록/수정 모달 - 기획서 스펙 반영
// ============================================

import { useState, useEffect } from 'react';
import { Modal, Button, AlertModal } from '@/components/common';
import { useContentDetail, useContentCategories, createContent, updateContent } from '@/hooks/useContents';
import { formatDate } from '@/lib/utils';
import type { ContentForm, ContentCategory } from '@/types';

interface ContentFormModalProps {
  contentId: string | null;
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

const initialForm: ContentForm = {
  title: '',
  content: '',
  category_ids: [],
  tags: [],
  visibility_scope: ['all'],
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
  const [newTag, setNewTag] = useState('');

  const isEditing = !!contentId;

  // contentId가 변경되거나 모달이 열릴 때 form 초기화
  useEffect(() => {
    if (!isOpen) return;
    
    // 새로운 컨텐츠를 선택하면 즉시 form 초기화 (로딩 중 이전 데이터 보이는 것 방지)
    setForm(initialForm);
    setNewTag('');
  }, [contentId, isOpen]);

  // 컨텐츠 데이터가 로드되면 form에 반영
  useEffect(() => {
    if (!isOpen || !isEditing) return;
    
    if (content) {
      setForm({
        title: content.title || '',
        content: content.content || '',
        category_ids: content.category_ids || [],
        tags: content.tags || [],
        visibility_scope: content.visibility_scope || ['all'],
        company_codes: content.company_codes || [],
        start_date: content.start_date ? formatDate(content.start_date, 'YYYY-MM-DD') : '',
        end_date: content.end_date ? formatDate(content.end_date, 'YYYY-MM-DD') : '',
        is_store_visible: content.is_store_visible || false,
        has_quote: content.has_quote || false,
        quote_content: content.quote_content || '',
        quote_source: content.quote_source || '',
      });
    }
  }, [content, isEditing, isOpen]);

  const handleChange = (key: keyof ContentForm, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !form.tags?.includes(newTag.trim())) {
      handleChange('tags', [...(form.tags || []), newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    handleChange('tags', form.tags?.filter(t => t !== tag));
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

              {/* 태그 */}
              <div className="flex items-start gap-2 mb-3">
                <span className={labelClass}>태그</span>
                <div className="flex-1">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className={`${inputClass} flex-1`}
                      placeholder="태그 입력 후 Enter 또는 추가 버튼 클릭"
                    />
                    <Button variant="secondary" size="sm" onClick={handleAddTag}>
                      추가
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {form.tags?.map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 rounded text-[12px] flex items-center gap-1">
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 내용 */}
              <div className="flex items-start gap-2">
                <span className={labelClass}>내용 <span className="text-red-500">*</span></span>
                <textarea
                  value={form.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  className={textareaClass}
                  rows={8}
                  placeholder="컨텐츠 내용을 입력하세요"
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
                    checked={form.is_store_visible}
                    onChange={(e) => handleChange('is_store_visible', e.target.checked)}
                    className={checkboxClass}
                  />
                  <span className="text-[13px] text-[#333]">노출</span>
                </label>
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


