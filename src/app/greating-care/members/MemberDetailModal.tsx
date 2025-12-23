'use client';

// ============================================
// 회원 상세 조회/수정 모달 - 기획서 스펙 반영
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMemberDetail, useMemberUpdate } from '@/hooks/useMembers';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, AlertModal, ConfirmModal } from '@/components/common';

interface MemberDetailModalProps {
  memberId: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

// 질병 옵션
const DISEASE_OPTIONS = [
  '당뇨', '고혈압', '골다공증', '비만', '지방간', '고콜레스테롤', '고중성지방', '암'
];

// 관심사 옵션
const INTEREST_OPTIONS = [
  '면역력', '눈건강', '뼈관절건강', '근력', '체중조절', '두뇌활동',
  '피로회복', '모발건강', '혈행개선', '피부건강', '갱년기', '소화기/장건강'
];

// 회원구분 옵션
const MEMBER_TYPE_OPTIONS = [
  { value: 'normal', label: '일반회원' },
  { value: 'fs', label: 'FS' },
  { value: 'affiliate', label: '제휴사' },
];

// 성별 옵션
const GENDER_OPTIONS = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
];

export function MemberDetailModal({ memberId, onClose, onSaved }: MemberDetailModalProps) {
  const { member, isLoading, refetch } = useMemberDetail(memberId);
  const { updateMember, isUpdating } = useMemberUpdate();
  
  const [formData, setFormData] = useState({
    name: '',
    birth_date: '',
    gender: '',
    member_type: 'normal',
    business_code: '',
    phone: '',
    is_active: true,
    marketing_sms_agreed: false,
    marketing_push_agreed: false,
    marketing_email_agreed: false,
    diseases: [] as string[],
    interests: [] as string[],
  });
  
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 회원 데이터가 로드되면 폼에 반영
  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || '',
        birth_date: member.birth_date ? member.birth_date.replace(/-/g, '') : '',
        gender: member.gender || '',
        member_type: member.member_type || 'normal',
        business_code: member.business_code || '',
        phone: member.phone || '',
        is_active: member.is_active,
        marketing_sms_agreed: member.marketing_sms_agreed,
        marketing_push_agreed: member.marketing_push_agreed,
        marketing_email_agreed: false,
        diseases: member.diseases || [],
        interests: member.interests || [],
      });
      setHasChanges(false);
    }
  }, [member]);

  const handleChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // 생년월일 유효성 검사
  const validateBirthDate = (value: string): boolean => {
    if (!value || value.length !== 8) return false;
    const year = parseInt(value.substring(0, 4));
    const month = parseInt(value.substring(4, 6));
    const day = parseInt(value.substring(6, 8));
    
    if (year < 1900 || year > 2099) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    
    return true;
  };

  // 관심사 선택 (최대 3개, 순서대로 번호 부여)
  const handleInterestToggle = (interest: string) => {
    setFormData(prev => {
      const current = [...prev.interests];
      const index = current.indexOf(interest);
      
      if (index > -1) {
        current.splice(index, 1);
      } else if (current.length < 3) {
        current.push(interest);
      }
      
      return { ...prev, interests: current };
    });
    setHasChanges(true);
  };

  // 저장
  const handleSave = async () => {
    // 생년월일 유효성 검사
    if (formData.birth_date && !validateBirthDate(formData.birth_date)) {
      setAlertMessage('생년월일 형식이 올바르지 않습니다.\n(YYYYMMDD 형식으로 입력해주세요)');
      return;
    }

    // TODO: 기업/사업장 코드 유효성 검사 API 호출
    // if (formData.business_code && !await validateBusinessCode(formData.business_code)) {
    //   setAlertMessage('기업/사업장 코드를 확인해주세요.');
    //   return;
    // }

    try {
      await updateMember(memberId!, {
        ...formData,
        birth_date: formData.birth_date 
          ? `${formData.birth_date.substring(0, 4)}-${formData.birth_date.substring(4, 6)}-${formData.birth_date.substring(6, 8)}`
          : null,
      });
      setAlertMessage('저장되었습니다.');
      refetch();
      onSaved?.();
      setHasChanges(false);
    } catch {
      setAlertMessage('저장 중 오류가 발생했습니다.');
    }
  };

  // 닫기 (변경사항 있으면 확인)
  const handleClose = useCallback(() => {
    if (hasChanges) {
      setShowConfirm(true);
    } else {
      onClose();
    }
  }, [hasChanges, onClose]);

  if (!memberId) return null;

  const inputClass = 'flex-1 h-[38px] px-3 border-0 text-[14px] bg-white focus:outline-none disabled:bg-gray-100 disabled:text-gray-500';
  const selectClass = 'flex-1 h-[38px] px-3 border-0 text-[14px] bg-white appearance-none focus:outline-none select-arrow';
  const labelClass = 'w-[130px] min-h-[38px] flex items-center justify-center bg-gray-100 text-[14px] font-medium text-gray-700 shrink-0';

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[900px] mx-4 max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">회원 조회</h2>
          <button onClick={handleClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C8E600]" />
          </div>
        ) : member ? (
          <div className="px-6 py-6 space-y-8">
            {/* 회원 기본 정보 */}
            <section>
              <h3 className="text-[15px] font-bold text-gray-900 mb-4">회원 기본 정보</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* ID - 읽기전용 */}
                <div className="flex border border-gray-200 rounded overflow-hidden">
                  <div className={labelClass}>ID</div>
                  <input
                    type="text"
                    value={member.email}
                    disabled
                    className={cn(inputClass, 'text-gray-400')}
                  />
                </div>

                {/* 고객명 */}
                <div className="flex border border-gray-200 rounded overflow-hidden">
                  <div className={labelClass}>고객명</div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={inputClass}
                  />
                </div>

                {/* 생년월일 */}
                <div className="flex border border-gray-200 rounded overflow-hidden">
                  <div className={labelClass}>생년월일</div>
                  <input
                    type="text"
                    value={formData.birth_date}
                    onChange={(e) => handleChange('birth_date', e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="19961128"
                    maxLength={8}
                    className={inputClass}
                  />
                </div>

                {/* 성별 */}
                <div className="flex border border-gray-200 rounded overflow-hidden">
                  <div className={labelClass}>성별</div>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    className={selectClass}
                  >
                    <option value="">선택</option>
                    {GENDER_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* 회원구분 */}
                <div className="flex border border-gray-200 rounded overflow-hidden">
                  <div className={labelClass}>회원구분</div>
                  <select
                    value={formData.member_type}
                    onChange={(e) => handleChange('member_type', e.target.value)}
                    className={selectClass}
                  >
                    {MEMBER_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* 기업/사업장 코드 */}
                <div className="flex border border-gray-200 rounded overflow-hidden">
                  <div className={labelClass}>기업/사업장 코드</div>
                  <input
                    type="text"
                    value={formData.business_code}
                    onChange={(e) => handleChange('business_code', e.target.value)}
                    className={inputClass}
                  />
                </div>

                {/* 휴대폰 번호 */}
                <div className="flex border border-gray-200 rounded overflow-hidden">
                  <div className={labelClass}>휴대폰 번호</div>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="010 - 1234 - 5678"
                    className={inputClass}
                  />
                </div>

                {/* 사용여부 */}
                <div className="flex border border-gray-200 rounded overflow-hidden">
                  <div className={labelClass}>사용여부</div>
                  <select
                    value={formData.is_active ? 'Y' : 'N'}
                    onChange={(e) => handleChange('is_active', e.target.value === 'Y')}
                    className={selectClass}
                  >
                    <option value="Y">Y</option>
                    <option value="N">N</option>
                  </select>
                </div>

                {/* 마케팅 수신동의 */}
                <div className="flex border border-gray-200 rounded overflow-hidden col-span-2">
                  <div className={labelClass}>마케팅 수신동의</div>
                  <div className="flex-1 flex items-center gap-6 px-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.marketing_sms_agreed}
                        onChange={(e) => handleChange('marketing_sms_agreed', e.target.checked)}
                        className="w-4 h-4 border border-gray-300 rounded accent-[#737373]"
                      />
                      <span className="text-[14px]">SMS</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.marketing_email_agreed}
                        onChange={(e) => handleChange('marketing_email_agreed', e.target.checked)}
                        className="w-4 h-4 border border-gray-300 rounded accent-[#737373]"
                      />
                      <span className="text-[14px]">이메일</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.marketing_push_agreed}
                        onChange={(e) => handleChange('marketing_push_agreed', e.target.checked)}
                        className="w-4 h-4 border border-gray-300 rounded accent-[#737373]"
                      />
                      <span className="text-[14px]">PUSH</span>
                    </label>
                  </div>
                </div>
              </div>
            </section>

            {/* 회원 건강 정보 */}
            <section>
              <h3 className="text-[15px] font-bold text-gray-900 mb-4">회원 건강 정보</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* 보유 질병 */}
                <div className="flex border border-gray-200 rounded overflow-hidden">
                  <div className={labelClass}>보유 질병</div>
                  <select
                    value={formData.diseases[0] || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleChange('diseases', value ? [value] : []);
                    }}
                    className={selectClass}
                  >
                    <option value="">선택</option>
                    {DISEASE_OPTIONS.map(disease => (
                      <option key={disease} value={disease}>{disease}</option>
                    ))}
                  </select>
                </div>

                {/* 관심사 */}
                <div className="flex border border-gray-200 rounded overflow-hidden">
                  <div className={labelClass}>관심사</div>
                  <div className="flex-1 px-3 py-2 text-[14px] text-gray-600">
                    {formData.interests.length > 0 
                      ? formData.interests.join('/') 
                      : '-'}
                  </div>
                </div>
              </div>
              
              {/* 관심사 선택 UI */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-[13px] text-gray-600 mb-3">관심사 선택 (최대 3개, 순서대로 번호 부여)</p>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((interest) => {
                    const index = formData.interests.indexOf(interest);
                    const isSelected = index > -1;
                    return (
                      <button
                        key={interest}
                        onClick={() => handleInterestToggle(interest)}
                        className={cn(
                          'relative px-3 py-1.5 rounded-full text-[13px] border transition-colors',
                          isSelected 
                            ? 'bg-[#C8E600] border-[#C8E600] text-black' 
                            : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                        )}
                      >
                        {interest}
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-white border border-gray-300 rounded-full text-[10px] flex items-center justify-center">
                            {index + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* 회원 연동 정보 */}
            <section>
              <h3 className="text-[15px] font-bold text-gray-900 mb-4">회원 연동 정보</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex border border-gray-200 rounded overflow-hidden">
                  <div className={labelClass}>그리팅 ID</div>
                  <input
                    type="text"
                    value={member.linked_accounts?.greating_id || '-'}
                    disabled
                    className={cn(inputClass, 'text-gray-400')}
                  />
                </div>
                <div className="flex border border-gray-200 rounded overflow-hidden">
                  <div className={labelClass}>그리팅 연동일</div>
                  <input
                    type="text"
                    value={member.linked_accounts?.greating_linked_at || '-'}
                    disabled
                    className={cn(inputClass, 'text-gray-400')}
                  />
                </div>
                <div className="flex border border-gray-200 rounded overflow-hidden">
                  <div className={labelClass}>카페테리아 ID</div>
                  <input
                    type="text"
                    value={member.linked_accounts?.cafeteria_id || '-'}
                    disabled
                    className={cn(inputClass, 'text-gray-400')}
                  />
                </div>
                <div className="flex border border-gray-200 rounded overflow-hidden">
                  <div className={labelClass}>카페테리아 연동일</div>
                  <input
                    type="text"
                    value={member.linked_accounts?.cafeteria_linked_at || '-'}
                    disabled
                    className={cn(inputClass, 'text-gray-400')}
                  />
                </div>
                <div className="flex border border-gray-200 rounded overflow-hidden">
                  <div className={labelClass}>그리팅-X 회원코드</div>
                  <input
                    type="text"
                    value={member.linked_accounts?.greating_x_code || '-'}
                    disabled
                    className={cn(inputClass, 'text-gray-400')}
                  />
                </div>
                <div className="flex border border-gray-200 rounded overflow-hidden">
                  <div className={labelClass}>그리팅-X 연동일</div>
                  <input
                    type="text"
                    value={member.linked_accounts?.greating_x_linked_at || '-'}
                    disabled
                    className={cn(inputClass, 'text-gray-400')}
                  />
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500">
            회원 정보를 불러올 수 없습니다.
          </div>
        )}

        {/* 버튼 */}
        {member && (
          <div className="flex justify-center gap-3 px-6 py-4 border-t sticky bottom-0 bg-white">
            <Button
              variant="secondary"
              onClick={handleClose}
              className="min-w-[100px] bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              취소하기
            </Button>
            <Button
              variant="secondary"
              onClick={handleSave}
              isLoading={isUpdating}
              className="min-w-[100px]"
            >
              저장
            </Button>
          </div>
        )}
      </div>

      {/* 알럿 모달 */}
      <AlertModal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        message={alertMessage || ''}
      />

      {/* 확인 모달 */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          setShowConfirm(false);
          onClose();
        }}
        message="변경사항이 저장되지 않았습니다.\n정말 나가시겠습니까?"
        cancelText="취소"
        confirmText="나가기"
      />
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(modal, document.body);
}
