'use client';

// ============================================
// 회원 상세 조회/수정 모달 - 기획서 반영
// ============================================

import { useState, useEffect } from 'react';
import { Modal, Button, AlertModal } from '@/components/common';
import { useMemberDetail } from '@/hooks/useMembers';
import { formatDate, cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface MemberDetailModalProps {
  memberId: string | null;
  onClose: () => void;
  onSave?: () => void;
}

const GENDER_OPTIONS = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
];

const MEMBER_TYPE_OPTIONS = [
  { value: 'normal', label: '일반회원' },
  { value: 'fs', label: 'FS' },
  { value: 'affiliate', label: '제휴사' },
];

const DISEASE_OPTIONS = [
  '당뇨', '고혈압', '골다공증', '비만', '지방간', '고콜레스테롤', '고중성지방', '암'
];

const INTEREST_OPTIONS = [
  '면역력', '눈건강', '뼈관절건강', '근력', '체중조절', '두뇌활동',
  '피로회복', '모발건강', '혈행개선', '피부건강', '갱년기', '소화기/장건강'
];

export function MemberDetailModal({ memberId, onClose, onSave }: MemberDetailModalProps) {
  const { member, isLoading, refetch } = useMemberDetail(memberId);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    birth_date: '',
    gender: '',
    member_type: '',
    business_code: '',
    phone: '',
    is_active: true,
    marketing_sms_agreed: false,
    marketing_email_agreed: false,
    marketing_push_agreed: false,
    diseases: [] as string[],
    interests: [] as string[],
  });

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || '',
        birth_date: member.birth_date ? member.birth_date.replace(/-/g, '') : '',
        gender: member.gender || '',
        member_type: member.member_type || 'normal',
        business_code: member.business_code || '',
        phone: member.phone || '',
        is_active: member.is_active ?? true,
        marketing_sms_agreed: member.marketing_sms_agreed ?? false,
        marketing_email_agreed: member.marketing_email_agreed ?? false,
        marketing_push_agreed: member.marketing_push_agreed ?? false,
        diseases: member.diseases || [],
        interests: member.interests || [],
      });
    }
  }, [member]);

  const handleChange = (key: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

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

  const handleSave = async () => {
    // 생년월일 유효성 검사
    if (formData.birth_date && !validateBirthDate(formData.birth_date)) {
      setAlertMessage('유효하지 않은 생년월일입니다.');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          ...formData,
          birth_date: formData.birth_date 
            ? `${formData.birth_date.substring(0, 4)}-${formData.birth_date.substring(4, 6)}-${formData.birth_date.substring(6, 8)}`
            : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || '저장에 실패했습니다.');
      }

      setIsEditing(false);
      refetch();
      onSave?.();
    } catch (error) {
      setAlertMessage(error instanceof Error ? error.message : '저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInterestToggle = (interest: string) => {
    const currentInterests = [...formData.interests];
    const index = currentInterests.indexOf(interest);
    
    if (index > -1) {
      currentInterests.splice(index, 1);
    } else if (currentInterests.length < 3) {
      currentInterests.push(interest);
    }
    
    handleChange('interests', currentInterests);
  };

  if (!memberId) return null;

  const inputClass = "flex-1 h-[38px] px-3 border border-gray-200 rounded text-[14px] bg-white focus:outline-none focus:border-[#737373] disabled:bg-gray-100 disabled:text-gray-500";
  const selectClass = "flex-1 h-[38px] px-3 border border-gray-200 rounded text-[14px] bg-white appearance-none focus:outline-none focus:border-[#737373] disabled:bg-gray-100 disabled:text-gray-500 select-arrow";
  const labelClass = "w-[120px] min-h-[38px] flex items-center justify-center bg-gray-50 border-r border-gray-200 px-3 py-2 text-[14px] font-medium text-gray-700 text-center";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
            <h2 className="text-lg font-bold text-gray-900">회원 조회</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C8E600]" />
            </div>
          ) : member ? (
            <div className="px-6 py-4 space-y-6">
              {/* 회원 기본 정보 */}
              <section>
                <h3 className="text-[15px] font-semibold text-gray-900 mb-3">회원 기본 정보</h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* ID */}
                  <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                    <div className={labelClass}>ID</div>
                    <input
                      type="text"
                      value={member.email}
                      disabled
                      className={inputClass}
                    />
                  </div>
                  
                  {/* 고객명 */}
                  <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                    <div className={labelClass}>고객명</div>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      disabled={!isEditing}
                      className={inputClass}
                    />
                  </div>

                  {/* 생년월일 */}
                  <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                    <div className={labelClass}>생년월일</div>
                    <input
                      type="text"
                      value={formData.birth_date}
                      onChange={(e) => handleChange('birth_date', e.target.value.replace(/\D/g, '').slice(0, 8))}
                      disabled={!isEditing}
                      placeholder="YYYYMMDD"
                      maxLength={8}
                      className={inputClass}
                    />
                  </div>

                  {/* 성별 */}
                  <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                    <div className={labelClass}>성별</div>
                    <select
                      value={formData.gender}
                      onChange={(e) => handleChange('gender', e.target.value)}
                      disabled={!isEditing}
                      className={selectClass}
                    >
                      <option value="">선택</option>
                      {GENDER_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* 회원구분 */}
                  <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                    <div className={labelClass}>회원구분</div>
                    <select
                      value={formData.member_type}
                      onChange={(e) => handleChange('member_type', e.target.value)}
                      disabled={!isEditing}
                      className={selectClass}
                    >
                      {MEMBER_TYPE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* 기업/사업장 코드 */}
                  <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                    <div className={labelClass}>기업/사업장 코드</div>
                    <input
                      type="text"
                      value={formData.business_code}
                      onChange={(e) => handleChange('business_code', e.target.value)}
                      disabled={!isEditing}
                      className={inputClass}
                    />
                  </div>

                  {/* 휴대폰 번호 */}
                  <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                    <div className={labelClass}>휴대폰 번호</div>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      disabled={!isEditing}
                      placeholder="010-0000-0000"
                      className={inputClass}
                    />
                  </div>

                  {/* 사용여부 */}
                  <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                    <div className={labelClass}>사용여부</div>
                    <select
                      value={formData.is_active ? 'Y' : 'N'}
                      onChange={(e) => handleChange('is_active', e.target.value === 'Y')}
                      disabled={!isEditing}
                      className={selectClass}
                    >
                      <option value="Y">Y</option>
                      <option value="N">N</option>
                    </select>
                  </div>

                  {/* 마케팅 수신동의 */}
                  <div className="col-span-2 flex items-center border border-gray-200 rounded overflow-hidden">
                    <div className={labelClass}>마케팅 수신동의</div>
                    <div className="flex-1 flex items-center gap-6 px-3 py-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.marketing_sms_agreed}
                          onChange={(e) => handleChange('marketing_sms_agreed', e.target.checked)}
                          disabled={!isEditing}
                          className="w-4 h-4 border border-gray-300 rounded accent-[#737373]"
                        />
                        <span className="text-[14px] text-gray-700">SMS</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.marketing_email_agreed}
                          onChange={(e) => handleChange('marketing_email_agreed', e.target.checked)}
                          disabled={!isEditing}
                          className="w-4 h-4 border border-gray-300 rounded accent-[#737373]"
                        />
                        <span className="text-[14px] text-gray-700">이메일</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.marketing_push_agreed}
                          onChange={(e) => handleChange('marketing_push_agreed', e.target.checked)}
                          disabled={!isEditing}
                          className="w-4 h-4 border border-gray-300 rounded accent-[#737373]"
                        />
                        <span className="text-[14px] text-gray-700">PUSH</span>
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              {/* 회원 건강 정보 */}
              <section>
                <h3 className="text-[15px] font-semibold text-gray-900 mb-3">회원 건강 정보</h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* 보유 질병 */}
                  <div className="flex items-start border border-gray-200 rounded overflow-hidden">
                    <div className={cn(labelClass, 'min-h-[60px]')}>보유 질병</div>
                    <div className="flex-1 p-2">
                      {isEditing ? (
                        <select
                          value={formData.diseases[0] || ''}
                          onChange={(e) => handleChange('diseases', e.target.value ? [e.target.value] : [])}
                          className={selectClass}
                        >
                          <option value="">선택</option>
                          {DISEASE_OPTIONS.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[14px] text-gray-900 px-1">
                          {formData.diseases.length > 0 ? formData.diseases.join(', ') : '-'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 관심사 */}
                  <div className="flex items-start border border-gray-200 rounded overflow-hidden">
                    <div className={cn(labelClass, 'min-h-[60px]')}>관심사</div>
                    <div className="flex-1 p-2">
                      {isEditing ? (
                        <div className="flex flex-wrap gap-1">
                          {INTEREST_OPTIONS.map((interest, idx) => {
                            const selectedIndex = formData.interests.indexOf(interest);
                            const isSelected = selectedIndex > -1;
                            return (
                              <button
                                key={interest}
                                type="button"
                                onClick={() => handleInterestToggle(interest)}
                                className={cn(
                                  'px-2 py-1 text-[12px] rounded border transition-colors relative',
                                  isSelected 
                                    ? 'bg-[#C8E600] border-[#C8E600] text-black' 
                                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                                )}
                              >
                                {interest}
                                {isSelected && (
                                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-black text-white text-[10px] rounded-full flex items-center justify-center">
                                    {selectedIndex + 1}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[14px] text-gray-900 px-1">
                          {formData.interests.length > 0 ? formData.interests.join('/') : '-'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* 회원 연동 정보 */}
              <section>
                <h3 className="text-[15px] font-semibold text-gray-900 mb-3">회원 연동 정보</h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* 그리팅 ID */}
                  <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                    <div className={labelClass}>그리팅 ID</div>
                    <input
                      type="text"
                      value={member.linked_accounts?.greating_id || '-'}
                      disabled
                      className={inputClass}
                    />
                  </div>

                  {/* 그리팅 연동일 */}
                  <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                    <div className={labelClass}>그리팅 연동일</div>
                    <input
                      type="text"
                      value={member.linked_accounts?.greating_linked_at 
                        ? formatDate(member.linked_accounts.greating_linked_at, 'YYYY.MM.DD') 
                        : '-'}
                      disabled
                      className={inputClass}
                    />
                  </div>

                  {/* 카페테리아 ID */}
                  <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                    <div className={labelClass}>카페테리아 ID</div>
                    <input
                      type="text"
                      value={member.linked_accounts?.cafeteria_id || '-'}
                      disabled
                      className={inputClass}
                    />
                  </div>

                  {/* 카페테리아 연동일 */}
                  <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                    <div className={labelClass}>카페테리아 연동일</div>
                    <input
                      type="text"
                      value={member.linked_accounts?.cafeteria_linked_at 
                        ? formatDate(member.linked_accounts.cafeteria_linked_at, 'YYYY.MM.DD') 
                        : '-'}
                      disabled
                      className={inputClass}
                    />
                  </div>

                  {/* 그리팅-X 회원코드 */}
                  <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                    <div className={labelClass}>그리팅-X 회원코드</div>
                    <input
                      type="text"
                      value={member.linked_accounts?.greating_x_code || '-'}
                      disabled
                      className={inputClass}
                    />
                  </div>

                  {/* 그리팅-X 연동일 */}
                  <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                    <div className={labelClass}>그리팅-X 연동일</div>
                    <input
                      type="text"
                      value={member.linked_accounts?.greating_x_linked_at 
                        ? formatDate(member.linked_accounts.greating_x_linked_at, 'YYYY.MM.DD') 
                        : '-'}
                      disabled
                      className={inputClass}
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
            <div className="flex justify-center gap-3 px-6 py-4 border-t">
              {isEditing ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setIsEditing(false)}
                    className="min-w-[100px] bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    취소하기
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    isLoading={isSaving}
                    className="min-w-[100px]"
                  >
                    저장
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    className="min-w-[100px] bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    취소하기
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setIsEditing(true)}
                    className="min-w-[100px]"
                  >
                    수정
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <AlertModal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        message={alertMessage || ''}
      />
    </>
  );
}
