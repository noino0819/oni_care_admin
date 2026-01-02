'use client';

// ============================================
// 컨텐츠 등록/수정 모달 - 레퍼런스 UI 적용
// ============================================

import { useState, useEffect, useRef } from 'react';
import { Modal, Button, AlertModal } from '@/components/common';
import { useContentDetail, useContentCategories, createContent, updateContent } from '@/hooks/useContents';
import { formatDate } from '@/lib/utils';
import type { ContentForm, ContentCategory } from '@/types';
import { X, Plus, Trash2 } from 'lucide-react';

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

// 스토어 공개 옵션
const STORE_OPTIONS = [
  { value: true, label: 'Y' },
  { value: false, label: 'N' },
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
  thumbnail_url: '',
  detail_images: [],
};

export function ContentFormModal({ contentId, isOpen, onClose, onSaved }: ContentFormModalProps) {
  const { content, isLoading: isLoadingContent } = useContentDetail(contentId);
  const { categories } = useContentCategories();
  const [form, setForm] = useState<ContentForm>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [selectedDetailImage, setSelectedDetailImage] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const detailInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!contentId;

  // contentId가 변경되거나 모달이 열릴 때 form 초기화
  useEffect(() => {
    if (!isOpen) return;
    setForm(initialForm);
    setNewTag('');
    setSelectedDetailImage(0);
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
        thumbnail_url: content.thumbnail_url || '',
        detail_images: content.detail_images || [],
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

  // 이미지 업로드 핸들러
  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    
    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        return data.data.url;
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const url = await uploadImage(file, 'thumbnails');
    setIsUploading(false);

    if (url) {
      handleChange('thumbnail_url', url);
    } else {
      setAlertMessage('이미지 업로드에 실패했습니다.');
    }
    
    // 입력 초기화
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = '';
    }
  };

  const handleDetailImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if ((form.detail_images?.length || 0) >= 10) {
      setAlertMessage('상세 이미지는 최대 10장까지 등록 가능합니다.');
      return;
    }

    setIsUploading(true);
    const url = await uploadImage(file, 'details');
    setIsUploading(false);

    if (url) {
      const newImages = [...(form.detail_images || []), url];
      handleChange('detail_images', newImages);
      setSelectedDetailImage(newImages.length - 1);
    } else {
      setAlertMessage('이미지 업로드에 실패했습니다.');
    }

    // 입력 초기화
    if (detailInputRef.current) {
      detailInputRef.current.value = '';
    }
  };

  const handleRemoveDetailImage = (index: number) => {
    const newImages = form.detail_images?.filter((_, i) => i !== index) || [];
    handleChange('detail_images', newImages);
    if (selectedDetailImage >= newImages.length) {
      setSelectedDetailImage(Math.max(0, newImages.length - 1));
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setAlertMessage('제목을 입력해주세요.');
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

  // 카테고리를 그룹으로 분류
  const groupedCategories = {
    interest: categories?.filter((cat: ContentCategory) => cat.category_type === '관심사') || [],
    disease: categories?.filter((cat: ContentCategory) => cat.category_type === '질병') || [],
    exercise: categories?.filter((cat: ContentCategory) => cat.category_type === '운동') || [],
  };

  const inputClass = 'h-[34px] px-3 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-[#666]';
  const labelClass = 'text-[13px] font-semibold text-[#333] w-[120px] flex-shrink-0 text-right pr-3';
  const checkboxClass = 'w-4 h-4 border border-gray-300 rounded cursor-pointer accent-[#333]';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? '컨텐츠 수정' : '컨텐츠 등록'}
        size="xl"
      >
        {isLoadingContent ? (
          <div className="py-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C8E600]" />
          </div>
        ) : (
          <div className="flex gap-6">
            {/* 좌측: 이미지 영역 */}
            <div className="w-[280px] flex-shrink-0">
              {/* 썸네일 이미지 */}
              <div className="mb-4">
                <h4 className="text-[13px] font-semibold mb-2">썸네일 이미지</h4>
                <div 
                  className="w-full h-[160px] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 overflow-hidden relative"
                  onClick={() => thumbnailInputRef.current?.click()}
                >
                  {form.thumbnail_url ? (
                    <>
                      <img 
                        src={form.thumbnail_url} 
                        alt="썸네일" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChange('thumbnail_url', '');
                        }}
                        className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full shadow flex items-center justify-center hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-gray-400 text-[13px]">+ 파일추가</span>
                    </>
                  )}
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* 상세 이미지 */}
              <div>
                <h4 className="text-[13px] font-semibold mb-2">
                  상세 이미지 <span className="text-gray-400">({form.detail_images?.length || 0}/10)</span>
                </h4>
                
                {/* 썸네일 리스트 */}
                <div className="flex flex-col gap-1 max-h-[320px] overflow-y-auto pr-1">
                  {form.detail_images?.map((img, index) => (
                    <div 
                      key={index}
                      className={`relative flex items-center gap-2 p-1 rounded cursor-pointer ${
                        selectedDetailImage === index ? 'bg-gray-100' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedDetailImage(index)}
                    >
                      <span className="text-[11px] text-gray-500 w-4">{index + 1}</span>
                      <div className="w-[60px] h-[60px] bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        <img src={img} alt={`상세${index + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveDetailImage(index);
                        }}
                        className="absolute right-1 top-1 w-5 h-5 bg-white rounded-full shadow flex items-center justify-center hover:bg-red-50"
                      >
                        <X className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  ))}
                  
                  {/* 추가 버튼 */}
                  {(form.detail_images?.length || 0) < 10 && (
                    <div 
                      className="flex items-center gap-2 p-1 rounded cursor-pointer hover:bg-gray-50"
                      onClick={() => detailInputRef.current?.click()}
                    >
                      <span className="text-[11px] text-gray-400 w-4">{(form.detail_images?.length || 0) + 1}</span>
                      <div className="w-[60px] h-[60px] bg-gray-100 rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
                        <Plus className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  )}
                </div>
                
                <input
                  ref={detailInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleDetailImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* 우측: 컨텐츠 속성 */}
            <div className="flex-1 min-w-0">
              {/* 상세 이미지 미리보기 */}
              {form.detail_images && form.detail_images.length > 0 && (
                <div className="mb-4">
                  <div className="w-full h-[300px] bg-gray-100 rounded-lg overflow-hidden">
                    <img 
                      src={form.detail_images[selectedDetailImage]} 
                      alt="상세 이미지" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-[13px] font-semibold border-b pb-2 mb-3">컨텐츠 속성</h4>
                
                {/* 컨텐츠 제목 */}
                <div className="flex items-center">
                  <span className={labelClass}>컨텐츠 제목</span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className={`${inputClass} flex-1`}
                    placeholder="최대 20자"
                    maxLength={20}
                  />
                </div>

                {/* 컨텐츠 카테고리 */}
                <div className="flex items-start">
                  <span className={labelClass}>컨텐츠 카테고리</span>
                  <div className="flex-1 border border-gray-200 rounded p-3 max-h-[200px] overflow-y-auto">
                    {/* 관심사 */}
                    <div className="mb-3">
                      <div className="text-[12px] font-bold text-gray-700 mb-2 pb-1 border-b">관심사</div>
                      <div className="grid grid-cols-3 gap-1">
                        {groupedCategories.interest.map((cat: ContentCategory) => (
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
                            <span className="text-[12px] text-[#333]">{cat.category_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 질병 */}
                    <div className="mb-3">
                      <div className="text-[12px] font-bold text-gray-700 mb-2 pb-1 border-b">질병</div>
                      <div className="grid grid-cols-3 gap-1">
                        {groupedCategories.disease.map((cat: ContentCategory) => (
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
                            <span className="text-[12px] text-[#333]">{cat.category_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 운동 */}
                    <div>
                      <div className="text-[12px] font-bold text-gray-700 mb-2 pb-1 border-b">운동</div>
                      <div className="grid grid-cols-3 gap-1">
                        {groupedCategories.exercise.map((cat: ContentCategory) => (
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
                            <span className="text-[12px] text-[#333]">{cat.category_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 컨텐츠 태그 */}
                <div className="flex items-start">
                  <span className={labelClass}>컨텐츠 태그</span>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className={`${inputClass} w-full`}
                      placeholder="텍스트 입력 후 엔터로 입력하실 수 있습니다."
                    />
                    {form.tags && form.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {form.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 rounded text-[12px] flex items-center gap-1">
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(tag)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 컨텐츠 노출 범위 */}
                <div className="flex items-center">
                  <span className={labelClass}>컨텐츠 노출 범위</span>
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
                        <span className="text-[12px] text-[#333]">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 기업/사업장 코드 */}
                <div className="flex items-center">
                  <span className={labelClass}>기업/사업장 코드</span>
                  <input
                    type="text"
                    value={form.company_codes?.join(',') || ''}
                    onChange={(e) => handleChange('company_codes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    className={`${inputClass} flex-1`}
                    placeholder="쉼표로 구분"
                  />
                </div>

                {/* 스토어 공개여부 */}
                <div className="flex items-center">
                  <span className={labelClass}>스토어 공개여부</span>
                  <div className="flex items-center gap-3">
                    {STORE_OPTIONS.map(option => (
                      <label key={String(option.value)} className="inline-flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.is_store_visible === option.value}
                          onChange={() => handleChange('is_store_visible', option.value)}
                          className={checkboxClass}
                        />
                        <span className="text-[12px] text-[#333]">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 컨텐츠 게시기간 */}
                <div className="flex items-center">
                  <span className={labelClass}>컨텐츠 게시기간</span>
                  <div className="flex items-center gap-2">
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
                </div>

                {/* 명언 내용 */}
                <div className="flex items-center">
                  <span className={labelClass}>명언 내용</span>
                  <input
                    type="text"
                    value={form.quote_content}
                    onChange={(e) => handleChange('quote_content', e.target.value)}
                    className={`${inputClass} flex-1`}
                    placeholder="홈화면에 등록될 명언을 입력해주세요."
                  />
                </div>

                {/* 명언 출처 */}
                <div className="flex items-center">
                  <span className={labelClass}>명언 출처</span>
                  <input
                    type="text"
                    value={form.quote_source}
                    onChange={(e) => handleChange('quote_source', e.target.value)}
                    className={`${inputClass} flex-1`}
                    placeholder="명언의 출처를 입력해주세요."
                  />
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex justify-center gap-3 pt-6 mt-4 border-t">
                <Button variant="secondary" onClick={onClose} className="min-w-[100px]">
                  취소하기
                </Button>
                <Button onClick={handleSubmit} disabled={isSaving || isUploading} className="min-w-[100px]">
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
