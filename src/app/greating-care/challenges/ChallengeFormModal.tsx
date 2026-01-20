'use client';

// ============================================
// 챌린지 등록/수정 모달
// ============================================

import { useState, useEffect, useRef } from 'react';
import { Button, DatePicker, AlertModal } from '@/components/common';
import { X, Plus, Trash2, Upload } from 'lucide-react';
import {
  useChallenge,
  createChallenge,
  updateChallenge,
  type Challenge,
  type DailyVerificationSetting,
  type RewardSettings,
  type ChallengeImages,
} from '@/hooks/useChallenges';

interface ChallengeFormModalProps {
  challengeId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// 챌린지 유형 옵션
const CHALLENGE_TYPE_OPTIONS = [
  { value: 'attendance', label: '출석' },
  { value: 'steps', label: '걸음수' },
  { value: 'meal', label: '식단' },
  { value: 'supplement', label: '영양제' },
  { value: 'nutrition_diagnosis', label: '영양진단' },
  { value: 'health_habit', label: '건강습관' },
  { value: 'quiz', label: '퀴즈' },
];

// 인증 방식 옵션
const VERIFICATION_METHOD_OPTIONS = [
  { value: 'roulette', label: '룰렛' },
  { value: 'auto', label: '자동' },
  { value: 'manual', label: '수동' },
];

// 공개범위 옵션
const VISIBILITY_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'normal', label: '일반회원' },
  { value: 'affiliate', label: '제휴사' },
  { value: 'fs', label: 'FS' },
];

// 등수 공개 방식 옵션
const RANK_DISPLAY_OPTIONS = [
  { value: 'hidden', label: '비공개' },
  { value: 'live', label: '선공개' },
  { value: 'post', label: '후공개' },
];

// 초기 폼 데이터
const initialFormData = {
  challenge_type: 'attendance',
  verification_method: 'roulette',
  title: '',
  subtitle: '',
  description: '',
  max_participants: null as number | null,
  challenge_duration_days: 7,
  display_order: 999,
  recruitment_start_date: '',
  recruitment_end_date: '',
  operation_start_date: '',
  operation_end_date: '',
  display_start_date: '',
  display_end_date: '',
  visibility_scope: ['all'],
  company_codes: [] as string[],
  store_visible: false,
  rank_display_type: 'hidden',
  daily_verification_count: 1,
  daily_verification_settings: [] as DailyVerificationSetting[],
  daily_achievement_count: 1,
  total_achievement_days: null as number | null,
  reward_settings: {
    stamp_enabled: false,
    stamp_count: 7,
  } as RewardSettings,
  type_settings: {} as Record<string, unknown>,
  images: {
    thumbnail: null,
    total_achievement_success: null,
    total_achievement_bg: null,
    verification_header: null,
    today_achievement_bg: null,
    today_achievement_success: null,
    detail_pages: [],
  } as ChallengeImages,
};

// 탭 타입
type TabType = 'basic' | 'verification' | 'reward';

export function ChallengeFormModal({
  challengeId,
  isOpen,
  onClose,
  onSaved,
}: ChallengeFormModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [formData, setFormData] = useState(initialFormData);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const { challenge, isLoading } = useChallenge(challengeId);

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (challenge && challengeId) {
      setFormData({
        challenge_type: challenge.challenge_type,
        verification_method: challenge.verification_method,
        title: challenge.title,
        subtitle: challenge.subtitle || '',
        description: challenge.description || '',
        max_participants: challenge.max_participants,
        challenge_duration_days: challenge.challenge_duration_days,
        display_order: challenge.display_order,
        recruitment_start_date: challenge.recruitment_start_date || '',
        recruitment_end_date: challenge.recruitment_end_date || '',
        operation_start_date: challenge.operation_start_date || '',
        operation_end_date: challenge.operation_end_date || '',
        display_start_date: challenge.display_start_date || '',
        display_end_date: challenge.display_end_date || '',
        visibility_scope: challenge.visibility_scope || ['all'],
        company_codes: challenge.company_codes || [],
        store_visible: challenge.store_visible,
        rank_display_type: challenge.rank_display_type,
        daily_verification_count: challenge.daily_verification_count,
        daily_verification_settings: challenge.daily_verification_settings || [],
        daily_achievement_count: challenge.daily_achievement_count,
        total_achievement_days: challenge.total_achievement_days,
        reward_settings: challenge.reward_settings || { stamp_enabled: false, stamp_count: 7 },
        type_settings: challenge.type_settings || {},
        images: challenge.images || initialFormData.images,
      });
    } else if (!challengeId) {
      setFormData(initialFormData);
    }
  }, [challenge, challengeId]);

  // 모달 닫힐 때 초기화
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('basic');
      setFormData(initialFormData);
    }
  }, [isOpen]);

  const handleChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // 유효성 검사
    if (!formData.title.trim()) {
      setAlertMessage('챌린지명을 입력해주세요.');
      return;
    }

    if (formData.title.length > 20) {
      setAlertMessage('챌린지명은 최대 20자까지 입력 가능합니다.');
      return;
    }

    if (formData.subtitle && formData.subtitle.length > 8) {
      setAlertMessage('챌린지 부제는 8자 이내로 입력해주세요.');
      return;
    }

    if (formData.challenge_duration_days > 30) {
      setAlertMessage('챌린지 기간은 최대 30일까지 설정할 수 있습니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData: Partial<Challenge> = {
        ...formData,
        max_participants: formData.max_participants || null,
        total_achievement_days: formData.total_achievement_days || null,
        recruitment_start_date: formData.recruitment_start_date || null,
        recruitment_end_date: formData.recruitment_end_date || null,
        operation_start_date: formData.operation_start_date || null,
        operation_end_date: formData.operation_end_date || null,
        display_start_date: formData.display_start_date || null,
        display_end_date: formData.display_end_date || null,
      };

      if (challengeId) {
        await updateChallenge(challengeId, submitData);
      } else {
        await createChallenge(submitData);
      }

      onSaved();
    } catch (error: unknown) {
      const err = error as { message?: string };
      setAlertMessage(err?.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 일일 인증 설정 추가
  const addDailyVerificationSetting = () => {
    const newSetting: DailyVerificationSetting = {
      order: formData.daily_verification_settings.length + 1,
      start_time: '00:00',
      end_time: '23:59',
      push_enabled: false,
    };
    handleChange('daily_verification_settings', [...formData.daily_verification_settings, newSetting]);
  };

  // 일일 인증 설정 제거
  const removeDailyVerificationSetting = (index: number) => {
    const newSettings = formData.daily_verification_settings.filter((_, i) => i !== index);
    handleChange('daily_verification_settings', newSettings);
  };

  // 일일 인증 설정 변경
  const updateDailyVerificationSetting = (index: number, field: string, value: unknown) => {
    const newSettings = [...formData.daily_verification_settings];
    newSettings[index] = { ...newSettings[index], [field]: value };
    handleChange('daily_verification_settings', newSettings);
  };

  // 이미지 업로드 핸들러
  const handleImageUpload = async (field: keyof ChallengeImages) => {
    setUploadingField(field);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingField) return;

    try {
      // 실제 API를 통해 파일 업로드
      const formDataToUpload = new FormData();
      formDataToUpload.append('file', file);
      formDataToUpload.append('folder', 'challenges');

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
        body: formDataToUpload,
      });

      if (!response.ok) {
        throw new Error('파일 업로드에 실패했습니다.');
      }

      const result = await response.json();
      
      // 서버에서 반환된 상대 경로 URL 저장 (예: /uploads/challenges/xxx.jpg)
      handleChange('images', {
        ...formData.images,
        [uploadingField]: result.data.url,
      });
    } catch (error) {
      setAlertMessage('이미지 업로드에 실패했습니다.');
    } finally {
      e.target.value = '';
      setUploadingField(null);
    }
  };

  // 이미지 URL을 전체 URL로 변환하는 헬퍼 함수
  const getImageUrl = (url: string | null) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
    return `${API_BASE_URL}${url}`;
  };

  if (!isOpen) return null;

  const inputClass = 'h-[36px] px-3 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] placeholder:text-gray-400';
  const selectClass = 'h-[36px] px-3 border border-gray-300 rounded text-[13px] bg-white appearance-none focus:outline-none focus:border-[#666] select-arrow';
  const labelClass = 'text-[13px] font-semibold text-[#333] whitespace-nowrap min-w-[100px]';
  const checkboxClass = 'w-4 h-4 border border-gray-300 rounded cursor-pointer accent-[#737373]';

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-[18px] font-bold">
              {challengeId ? '챌린지 수정' : '챌린지 등록'}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 탭 */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-6 py-3 text-[14px] font-medium border-b-2 ${
                activeTab === 'basic'
                  ? 'text-black border-black'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              기본정보
            </button>
            <button
              onClick={() => setActiveTab('verification')}
              className={`px-6 py-3 text-[14px] font-medium border-b-2 ${
                activeTab === 'verification'
                  ? 'text-black border-black'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              인증조건
            </button>
            <button
              onClick={() => setActiveTab('reward')}
              className={`px-6 py-3 text-[14px] font-medium border-b-2 ${
                activeTab === 'reward'
                  ? 'text-black border-black'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              룰렛/보상 설정
            </button>
          </div>

          {/* 콘텐츠 */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              </div>
            ) : (
              <>
                {/* 기본정보 탭 */}
                {activeTab === 'basic' && (
                  <div className="space-y-4">
                    {/* 챌린지 유형 */}
                    <div className="flex items-center gap-4">
                      <span className={labelClass}>챌린지 유형 *</span>
                      <select
                        value={formData.challenge_type}
                        onChange={(e) => handleChange('challenge_type', e.target.value)}
                        className={`${selectClass} w-[200px]`}
                        disabled={!!challengeId}
                      >
                        {CHALLENGE_TYPE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {challengeId && (
                        <span className="text-[12px] text-gray-500">※ 수정 시 챌린지 타입 변경은 불가능합니다.</span>
                      )}
                    </div>

                    {/* 인증 방식 */}
                    <div className="flex items-center gap-4">
                      <span className={labelClass}>인증 방식 *</span>
                      <select
                        value={formData.verification_method}
                        onChange={(e) => handleChange('verification_method', e.target.value)}
                        className={`${selectClass} w-[200px]`}
                      >
                        {VERIFICATION_METHOD_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* 챌린지명 */}
                    <div className="flex items-center gap-4">
                      <span className={labelClass}>챌린지명 *</span>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        className={`${inputClass} flex-1`}
                        placeholder="챌린지명을 입력하세요 (최대 20자)"
                        maxLength={20}
                      />
                      <span className="text-[12px] text-gray-500">{formData.title.length}/20</span>
                    </div>

                    {/* 챌린지 부제 */}
                    <div className="flex items-center gap-4">
                      <span className={labelClass}>챌린지 부제</span>
                      <input
                        type="text"
                        value={formData.subtitle}
                        onChange={(e) => handleChange('subtitle', e.target.value)}
                        className={`${inputClass} w-[200px]`}
                        placeholder="8자 이내"
                        maxLength={8}
                      />
                      <span className="text-[12px] text-gray-500">※ 홈/챌린지 진행현황에 표시됩니다.</span>
                    </div>

                    {/* 챌린지 기간 */}
                    <div className="flex items-center gap-4">
                      <span className={labelClass}>챌린지 기간 *</span>
                      <input
                        type="number"
                        value={formData.challenge_duration_days}
                        onChange={(e) => handleChange('challenge_duration_days', parseInt(e.target.value) || 7)}
                        className={`${inputClass} w-[100px]`}
                        min={1}
                        max={30}
                      />
                      <span className="text-[13px] text-[#333]">일</span>
                      <span className="text-[12px] text-gray-500">※ 최대 30일까지 설정 가능</span>
                    </div>

                    {/* 모집인원 */}
                    <div className="flex items-center gap-4">
                      <span className={labelClass}>모집인원</span>
                      <input
                        type="number"
                        value={formData.max_participants || ''}
                        onChange={(e) => handleChange('max_participants', e.target.value ? parseInt(e.target.value) : null)}
                        className={`${inputClass} w-[150px]`}
                        placeholder="제한없음"
                      />
                      <span className="text-[12px] text-gray-500">※ 비워두면 제한없음</span>
                    </div>

                    {/* 공개범위 */}
                    <div className="flex items-start gap-4">
                      <span className={`${labelClass} pt-2`}>공개범위 *</span>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          {VISIBILITY_OPTIONS.map(option => (
                            <label key={option.value} className="inline-flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.visibility_scope?.includes(option.value) || false}
                                onChange={(e) => {
                                  const current = formData.visibility_scope || [];
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
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.store_visible}
                            onChange={(e) => handleChange('store_visible', e.target.checked)}
                            className={checkboxClass}
                          />
                          <span className="text-[13px] text-[#333]">스토어 노출</span>
                        </label>
                      </div>
                    </div>

                    {/* 운영기간 */}
                    <div className="flex items-center gap-4">
                      <span className={labelClass}>운영기간</span>
                      <DatePicker
                        value={formData.operation_start_date ? new Date(formData.operation_start_date) : null}
                        onChange={(date) => handleChange('operation_start_date', date ? date.toISOString().split('T')[0] : '')}
                        placeholder="시작일"
                      />
                      <span className="text-gray-400">~</span>
                      <DatePicker
                        value={formData.operation_end_date ? new Date(formData.operation_end_date) : null}
                        onChange={(date) => handleChange('operation_end_date', date ? date.toISOString().split('T')[0] : '')}
                        placeholder="종료일"
                      />
                    </div>

                    {/* 모집기간 */}
                    <div className="flex items-center gap-4">
                      <span className={labelClass}>모집기간</span>
                      <DatePicker
                        value={formData.recruitment_start_date ? new Date(formData.recruitment_start_date) : null}
                        onChange={(date) => handleChange('recruitment_start_date', date ? date.toISOString().split('T')[0] : '')}
                        placeholder="시작일"
                      />
                      <span className="text-gray-400">~</span>
                      <DatePicker
                        value={formData.recruitment_end_date ? new Date(formData.recruitment_end_date) : null}
                        onChange={(date) => handleChange('recruitment_end_date', date ? date.toISOString().split('T')[0] : '')}
                        placeholder="종료일"
                      />
                    </div>

                    {/* 노출기간 */}
                    <div className="flex items-center gap-4">
                      <span className={labelClass}>노출기간</span>
                      <DatePicker
                        value={formData.display_start_date ? new Date(formData.display_start_date) : null}
                        onChange={(date) => handleChange('display_start_date', date ? date.toISOString().split('T')[0] : '')}
                        placeholder="시작일"
                      />
                      <span className="text-gray-400">~</span>
                      <DatePicker
                        value={formData.display_end_date ? new Date(formData.display_end_date) : null}
                        onChange={(date) => handleChange('display_end_date', date ? date.toISOString().split('T')[0] : '')}
                        placeholder="종료일"
                      />
                    </div>

                    {/* 전시순서 */}
                    <div className="flex items-center gap-4">
                      <span className={labelClass}>전시순서</span>
                      <input
                        type="number"
                        value={formData.display_order}
                        onChange={(e) => handleChange('display_order', parseInt(e.target.value) || 999)}
                        className={`${inputClass} w-[100px]`}
                        min={1}
                      />
                    </div>

                    {/* 등수 공개 */}
                    <div className="flex items-center gap-4">
                      <span className={labelClass}>등수 공개</span>
                      <select
                        value={formData.rank_display_type}
                        onChange={(e) => handleChange('rank_display_type', e.target.value)}
                        className={`${selectClass} w-[150px]`}
                      >
                        {RANK_DISPLAY_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* 챌린지 설명 */}
                    <div className="flex items-start gap-4">
                      <span className={`${labelClass} pt-2`}>챌린지 설명</span>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        className="flex-1 p-3 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] min-h-[100px]"
                        placeholder="챌린지 설명을 입력하세요"
                      />
                    </div>

                    {/* 이미지 업로드 영역 */}
                    <div className="border-t pt-4 mt-4">
                      <h3 className="text-[14px] font-semibold mb-4">이미지 설정</h3>
                      <div className="grid grid-cols-3 gap-4">
                        {/* 썸네일 */}
                        <div className="border rounded p-3">
                          <div className="text-[13px] font-medium mb-2">썸네일 아이콘</div>
                          <div 
                            className="w-full h-[100px] bg-gray-100 rounded flex items-center justify-center cursor-pointer hover:bg-gray-200"
                            onClick={() => handleImageUpload('thumbnail')}
                          >
                            {formData.images.thumbnail ? (
                              <img src={getImageUrl(formData.images.thumbnail)} alt="썸네일" className="max-w-full max-h-full object-contain" />
                            ) : (
                              <Upload className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                        </div>
                        {/* 인증화면 상단 이미지 */}
                        <div className="border rounded p-3">
                          <div className="text-[13px] font-medium mb-2">인증화면 상단</div>
                          <div 
                            className="w-full h-[100px] bg-gray-100 rounded flex items-center justify-center cursor-pointer hover:bg-gray-200"
                            onClick={() => handleImageUpload('verification_header')}
                          >
                            {formData.images.verification_header ? (
                              <img src={getImageUrl(formData.images.verification_header)} alt="인증화면 상단" className="max-w-full max-h-full object-contain" />
                            ) : (
                              <Upload className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                        </div>
                        {/* 전체 달성현황 성공 이미지 */}
                        <div className="border rounded p-3">
                          <div className="text-[13px] font-medium mb-2">전체달성 성공</div>
                          <div 
                            className="w-full h-[100px] bg-gray-100 rounded flex items-center justify-center cursor-pointer hover:bg-gray-200"
                            onClick={() => handleImageUpload('total_achievement_success')}
                          >
                            {formData.images.total_achievement_success ? (
                              <img src={getImageUrl(formData.images.total_achievement_success)} alt="전체달성 성공" className="max-w-full max-h-full object-contain" />
                            ) : (
                              <Upload className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        {/* 전체 달성현황 배경 */}
                        <div className="border rounded p-3">
                          <div className="text-[13px] font-medium mb-2">전체달성 배경</div>
                          <div 
                            className="w-full h-[100px] bg-gray-100 rounded flex items-center justify-center cursor-pointer hover:bg-gray-200"
                            onClick={() => handleImageUpload('total_achievement_bg')}
                          >
                            {formData.images.total_achievement_bg ? (
                              <img src={getImageUrl(formData.images.total_achievement_bg)} alt="전체달성 배경" className="max-w-full max-h-full object-contain" />
                            ) : (
                              <Upload className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                        </div>
                        {/* 오늘의 달성현황 성공 */}
                        <div className="border rounded p-3">
                          <div className="text-[13px] font-medium mb-2">오늘달성 성공</div>
                          <div 
                            className="w-full h-[100px] bg-gray-100 rounded flex items-center justify-center cursor-pointer hover:bg-gray-200"
                            onClick={() => handleImageUpload('today_achievement_success')}
                          >
                            {formData.images.today_achievement_success ? (
                              <img src={getImageUrl(formData.images.today_achievement_success)} alt="오늘달성 성공" className="max-w-full max-h-full object-contain" />
                            ) : (
                              <Upload className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                        </div>
                        {/* 오늘의 달성현황 배경 */}
                        <div className="border rounded p-3">
                          <div className="text-[13px] font-medium mb-2">오늘달성 배경</div>
                          <div 
                            className="w-full h-[100px] bg-gray-100 rounded flex items-center justify-center cursor-pointer hover:bg-gray-200"
                            onClick={() => handleImageUpload('today_achievement_bg')}
                          >
                            {formData.images.today_achievement_bg ? (
                              <img src={getImageUrl(formData.images.today_achievement_bg)} alt="오늘달성 배경" className="max-w-full max-h-full object-contain" />
                            ) : (
                              <Upload className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 인증조건 탭 */}
                {activeTab === 'verification' && (
                  <div className="space-y-4">
                    {/* 일일 인증 횟수 */}
                    <div className="flex items-center gap-4">
                      <span className={labelClass}>일일 인증 횟수</span>
                      <input
                        type="number"
                        value={formData.daily_verification_count}
                        onChange={(e) => handleChange('daily_verification_count', parseInt(e.target.value) || 1)}
                        className={`${inputClass} w-[100px]`}
                        min={1}
                        max={10}
                      />
                      <span className="text-[13px] text-[#333]">회</span>
                    </div>

                    {/* 일일 달성 횟수 */}
                    <div className="flex items-center gap-4">
                      <span className={labelClass}>일일 달성 횟수</span>
                      <input
                        type="number"
                        value={formData.daily_achievement_count}
                        onChange={(e) => handleChange('daily_achievement_count', parseInt(e.target.value) || 1)}
                        className={`${inputClass} w-[100px]`}
                        min={1}
                      />
                      <span className="text-[13px] text-[#333]">회</span>
                      <span className="text-[12px] text-gray-500">※ 일일 인증 횟수 이하로 설정해주세요.</span>
                    </div>

                    {/* 총 달성 일수 */}
                    <div className="flex items-center gap-4">
                      <span className={labelClass}>총 달성 일수</span>
                      <input
                        type="number"
                        value={formData.total_achievement_days || ''}
                        onChange={(e) => handleChange('total_achievement_days', e.target.value ? parseInt(e.target.value) : null)}
                        className={`${inputClass} w-[100px]`}
                        placeholder="전체"
                      />
                      <span className="text-[13px] text-[#333]">일</span>
                      <span className="text-[12px] text-gray-500">※ 비워두면 챌린지 기간 전체</span>
                    </div>

                    {/* 걸음수 챌린지 설정 */}
                    {formData.challenge_type === 'steps' && (
                      <div className="border-t pt-4 mt-4">
                        <h3 className="text-[14px] font-semibold mb-4">걸음수 설정</h3>
                        <div className="flex items-center gap-4">
                          <span className={labelClass}>목표 걸음수 *</span>
                          <input
                            type="number"
                            value={(formData.type_settings as { target_steps?: number })?.target_steps || ''}
                            onChange={(e) => handleChange('type_settings', {
                              ...formData.type_settings,
                              target_steps: parseInt(e.target.value) || 0
                            })}
                            className={`${inputClass} w-[150px]`}
                            placeholder="목표 걸음수"
                          />
                          <span className="text-[13px] text-[#333]">걸음</span>
                        </div>
                      </div>
                    )}

                    {/* 인증 시간대 설정 */}
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[14px] font-semibold">인증 시간대 설정</h3>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={addDailyVerificationSetting}
                          className="flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" />
                          추가
                        </Button>
                      </div>

                      {formData.daily_verification_settings.length === 0 ? (
                        <div className="text-[13px] text-gray-500 text-center py-4 bg-gray-50 rounded">
                          인증 시간대를 추가해주세요.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {formData.daily_verification_settings.map((setting, index) => (
                            <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded">
                              <span className="text-[13px] font-medium w-[60px]">{index + 1}차 인증</span>
                              <input
                                type="time"
                                value={setting.start_time}
                                onChange={(e) => updateDailyVerificationSetting(index, 'start_time', e.target.value)}
                                className={`${inputClass} w-[120px]`}
                              />
                              <span className="text-gray-400">~</span>
                              <input
                                type="time"
                                value={setting.end_time}
                                onChange={(e) => updateDailyVerificationSetting(index, 'end_time', e.target.value)}
                                className={`${inputClass} w-[120px]`}
                              />
                              <label className="inline-flex items-center gap-1 cursor-pointer ml-4">
                                <input
                                  type="checkbox"
                                  checked={setting.push_enabled}
                                  onChange={(e) => updateDailyVerificationSetting(index, 'push_enabled', e.target.checked)}
                                  className={checkboxClass}
                                />
                                <span className="text-[13px] text-[#333]">푸시 알림</span>
                              </label>
                              <button
                                onClick={() => removeDailyVerificationSetting(index)}
                                className="ml-auto p-1 hover:bg-gray-200 rounded"
                              >
                                <Trash2 className="w-4 h-4 text-gray-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 룰렛/보상 설정 탭 */}
                {activeTab === 'reward' && (
                  <div className="space-y-4">
                    {/* 스탬프 사용 여부 */}
                    <div className="flex items-center gap-4">
                      <span className={labelClass}>스탬프 사용</span>
                      <label className="inline-flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.reward_settings.stamp_enabled}
                          onChange={(e) => handleChange('reward_settings', {
                            ...formData.reward_settings,
                            stamp_enabled: e.target.checked
                          })}
                          className={checkboxClass}
                        />
                        <span className="text-[13px] text-[#333]">사용</span>
                      </label>
                    </div>

                    {formData.reward_settings.stamp_enabled && (
                      <>
                        {/* 스탬프 개수 */}
                        <div className="flex items-center gap-4">
                          <span className={labelClass}>스탬프 개수</span>
                          <input
                            type="number"
                            value={formData.reward_settings.stamp_count}
                            onChange={(e) => handleChange('reward_settings', {
                              ...formData.reward_settings,
                              stamp_count: parseInt(e.target.value) || 7
                            })}
                            className={`${inputClass} w-[100px]`}
                            min={1}
                            max={30}
                          />
                          <span className="text-[13px] text-[#333]">개</span>
                        </div>
                      </>
                    )}

                    {/* 룰렛 설정 (인증 방식이 룰렛일 때만) */}
                    {formData.verification_method === 'roulette' && (
                      <div className="border-t pt-4 mt-4">
                        <h3 className="text-[14px] font-semibold mb-4">룰렛 설정</h3>
                        <div className="text-[13px] text-gray-500 text-center py-4 bg-gray-50 rounded">
                          룰렛 세그먼트 설정은 추후 구현 예정입니다.
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </>
            )}
          </div>

          {/* 푸터 */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
            <Button variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </div>

      {/* 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 알럿 모달 */}
      <AlertModal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        message={alertMessage || ''}
      />
    </>
  );
}

