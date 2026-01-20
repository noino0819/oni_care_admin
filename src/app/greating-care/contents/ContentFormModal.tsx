'use client';

// ============================================
// 컨텐츠 등록/수정 모달 - 레퍼런스 UI 적용
// ============================================

import { useState, useEffect, useRef } from 'react';
import { Modal, Button, AlertModal } from '@/components/common';
import { useContentDetail, useContentCategories, createContent, updateContent } from '@/hooks/useContents';
import { formatDate } from '@/lib/utils';
import type { ContentForm } from '@/types';
import { X, Plus, Trash2 } from 'lucide-react';

// 계층 구조 카테고리 타입
interface HierarchicalCategory {
  id: number;
  category_type: string;
  category_name: string;
  parent_id: number | null;
  display_order: number;
  children?: HierarchicalCategory[];
}

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
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const detailInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!contentId;

  useEffect(() => {
    if (!isOpen) return;
    setForm(initialForm);
    setNewTag('');
    setSelectedDetailImage(0);
    setIsCategoryOpen(false);
  }, [contentId, isOpen]);

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

  const handleCategoryToggle = (categoryId: number) => {
    const current = form.category_ids || [];
    if (current.includes(categoryId)) {
      handleChange('category_ids', current.filter(id => id !== categoryId));
    } else {
      if (current.length >= 5) {
        setAlertMessage('카테고리는 최대 5개까지 선택 가능합니다.');
        return;
      }
      handleChange('category_ids', [...current, categoryId]);
    }
  };

  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/upload`, {
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

  // 이미지 URL을 전체 URL로 변환하는 헬퍼 함수
  const getImageUrl = (url: string | undefined | null) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
    return `${API_BASE_URL}${url}`;
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

  // 계층 구조 카테고리로 캐스팅
  const hierarchicalCategories = categories as HierarchicalCategory[];

  const getSelectedCategoryNames = () => {
    if (!hierarchicalCategories || !form.category_ids?.length) return [];
    const names: string[] = [];
    hierarchicalCategories.forEach((mainCat) => {
      mainCat.children?.forEach((subCat) => {
        if (form.category_ids?.includes(subCat.id)) {
          names.push(subCat.category_name);
        }
      });
    });
    return names;
  };

  const inputClass = 'h-[32px] px-3 border border-gray-300 rounded text-[13px] focus:outline-none focus:border-[#333] bg-white';
  const labelClass = 'text-[13px] text-[#333] w-[100px] flex-shrink-0 text-right pr-3 whitespace-nowrap';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? '컨텐츠 수정' : '컨텐츠 등록'}
        size="4xl"
      >
        {isLoadingContent ? (
          <div className="py-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C8E600]" />
          </div>
        ) : (
          <div className="max-h-[75vh] overflow-y-auto">
            {/* 상단: 썸네일 + 컨텐츠 속성 */}
            <div className="flex gap-6 mb-6">
              {/* 좌측: 썸네일 이미지 */}
              <div className="w-[200px] flex-shrink-0">
                <h4 className="text-[13px] font-medium text-[#333] mb-2">썸네일 이미지</h4>
                <div 
                  className="w-full h-[180px] bg-[#f5f5f5] rounded border border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 overflow-hidden relative"
                  onClick={() => thumbnailInputRef.current?.click()}
                >
                  {form.thumbnail_url ? (
                    <>
                      <img 
                        src={getImageUrl(form.thumbnail_url)} 
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
                        <Trash2 className="w-3 h-3 text-gray-500" />
                      </button>
                    </>
                  ) : (
                    <span className="text-[13px] text-gray-400">+ 파일추가</span>
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

              {/* 우측: 컨텐츠 속성 */}
              <div className="flex-1">
                <h4 className="text-[13px] font-medium text-[#333] mb-2">컨텐츠 속성</h4>
                
                <div className="space-y-2">
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
                    <div className="flex-1 relative">
                      <div 
                        className={`${inputClass} w-full min-h-[32px] h-auto py-1 cursor-pointer flex items-center justify-between`}
                        onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                      >
                        <span className={`text-[13px] ${getSelectedCategoryNames().length > 0 ? 'text-[#333]' : 'text-gray-400'}`}>
                          {getSelectedCategoryNames().length > 0 
                            ? getSelectedCategoryNames().join(', ')
                            : '최대 5개 카테고리 선택가능'}
                        </span>
                        <svg className={`w-4 h-4 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      
                      {isCategoryOpen && hierarchicalCategories && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 p-5 min-w-[550px]">
                          {/* 대분류별 그룹화 (계층 구조) */}
                          <div className="flex gap-8">
                            {hierarchicalCategories.map((mainCat) => (
                              <div key={mainCat.id} className="min-w-[140px]">
                                {/* 대분류 헤더 */}
                                <div className="font-bold text-[15px] text-black pb-2 mb-3 border-b-2 border-black">
                                  {mainCat.category_name}
                                </div>
                                {/* 중분류 체크박스 리스트 */}
                                <div className="space-y-3">
                                  {mainCat.children && mainCat.children.length > 0 ? (
                                    mainCat.children.map((subCat) => (
                                      <label 
                                        key={subCat.id} 
                                        className="flex items-center gap-3 cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={form.category_ids?.includes(subCat.id) || false}
                                          onChange={() => handleCategoryToggle(subCat.id)}
                                          className="w-[18px] h-[18px] border-2 border-gray-400 rounded-sm appearance-none checked:bg-black checked:border-black relative cursor-pointer
                                            after:content-[''] after:absolute after:hidden checked:after:block
                                            after:left-[5px] after:top-[1px] after:w-[5px] after:h-[10px]
                                            after:border-white after:border-r-2 after:border-b-2 after:rotate-45"
                                        />
                                        <span className="text-[14px] text-[#333]">{subCat.category_name}</span>
                                      </label>
                                    ))
                                  ) : (
                                    <span className="text-[13px] text-gray-400">항목 없음</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
                        <div className="flex flex-wrap gap-1 mt-1">
                          {form.tags.map((tag, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-[12px] text-[#333]">
                              {tag}
                              <button onClick={() => handleRemoveTag(tag)} className="text-gray-400 hover:text-red-500">
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
                    <div className="flex items-center gap-2">
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
                            className="w-4 h-4 accent-[#333]"
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
                    />
                  </div>

                  {/* 스토어 공개여부 */}
                  <div className="flex items-center">
                    <span className={labelClass}>스토어 공개여부</span>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.is_store_visible === true}
                          onChange={() => handleChange('is_store_visible', true)}
                          className="w-4 h-4 accent-[#333]"
                        />
                        <span className="text-[12px] text-[#333]">Y</span>
                      </label>
                      <label className="inline-flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.is_store_visible === false}
                          onChange={() => handleChange('is_store_visible', false)}
                          className="w-4 h-4 accent-[#333]"
                        />
                        <span className="text-[12px] text-[#333]">N</span>
                      </label>
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
                        className={`${inputClass} w-[130px]`}
                      />
                      <span className="text-gray-400">~</span>
                      <input
                        type="date"
                        value={form.end_date}
                        onChange={(e) => handleChange('end_date', e.target.value)}
                        className={`${inputClass} w-[130px]`}
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
              </div>
            </div>

            {/* 하단: 상세 이미지 */}
            <div>
              <h4 className="text-[13px] font-medium text-[#333] mb-2">
                상세 이미지 <span className="text-gray-400">({form.detail_images?.length || 0}/10)</span>
              </h4>
              
              <div className="flex gap-4">
                {/* 좌측: 상세 이미지 리스트 */}
                <div className="w-[140px] flex-shrink-0 space-y-2 max-h-[400px] overflow-y-auto">
                  {form.detail_images?.map((img, index) => (
                    <div 
                      key={index}
                      className={`relative cursor-pointer rounded overflow-hidden border-2 ${
                        selectedDetailImage === index ? 'border-blue-500' : 'border-transparent'
                      }`}
                      onClick={() => setSelectedDetailImage(index)}
                    >
                      <div className="flex items-start gap-1">
                        <span className="text-[11px] text-gray-400 pt-1">{index + 1}</span>
                        <div className="w-[100px] h-[100px] bg-gray-100 rounded overflow-hidden">
                          <img src={getImageUrl(img)} alt={`상세${index + 1}`} className="w-full h-full object-cover" />
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveDetailImage(index);
                        }}
                        className="absolute top-0 right-0 w-5 h-5 bg-white/80 rounded-full flex items-center justify-center hover:bg-red-50"
                      >
                        <X className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  ))}
                  
                  {(form.detail_images?.length || 0) < 10 && (
                    <div 
                      className="flex items-start gap-1 cursor-pointer"
                      onClick={() => detailInputRef.current?.click()}
                    >
                      <span className="text-[11px] text-gray-400 pt-1">{(form.detail_images?.length || 0) + 1}</span>
                      <div className="w-[100px] h-[100px] bg-[#f5f5f5] rounded border border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400">
                        <Plus className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  )}
                  
                  <input
                    ref={detailInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleDetailImageUpload}
                    className="hidden"
                  />
                </div>

                {/* 우측: 상세 이미지 미리보기 */}
                <div className="flex-1">
                  {form.detail_images && form.detail_images.length > 0 ? (
                    <div className="w-full h-[400px] bg-[#f5f5f5] rounded overflow-hidden border border-gray-200 flex items-center justify-center">
                      <img 
                        src={getImageUrl(form.detail_images[selectedDetailImage])} 
                        alt="상세 이미지" 
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-[400px] bg-[#f5f5f5] rounded border border-dashed border-gray-300 flex items-center justify-center">
                      <span className="text-gray-400 text-[13px]">상세 이미지를 추가해주세요</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex justify-center gap-3 pt-5 mt-5 border-t">
          <Button 
            variant="secondary" 
            onClick={onClose} 
            className="min-w-[100px] bg-[#888] text-white hover:bg-[#777]"
          >
            취소하기
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSaving || isUploading} 
            className="min-w-[100px] bg-[#4a90d9] text-white hover:bg-[#3a80c9]"
          >
            {isSaving ? '저장 중...' : '저장'}
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
