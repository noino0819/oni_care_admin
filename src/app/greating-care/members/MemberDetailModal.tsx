'use client';

// ============================================
// 회원 상세 조회 모달
// ============================================

import { Modal } from '@/components/common';
import { useMemberDetail } from '@/hooks/useMembers';
import {
  maskEmail,
  maskName,
  maskPhone,
  formatDate,
  getGenderLabel,
} from '@/lib/utils';

interface MemberDetailModalProps {
  memberId: string | null;
  onClose: () => void;
}

export function MemberDetailModal({ memberId, onClose }: MemberDetailModalProps) {
  const { member, isLoading } = useMemberDetail(memberId);

  if (!memberId) return null;

  return (
    <Modal
      isOpen={!!memberId}
      onClose={onClose}
      title="회원 상세정보"
      size="lg"
    >
      {isLoading ? (
        <div className="py-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C8E600]" />
        </div>
      ) : member ? (
        <div className="space-y-6">
          {/* 기본 정보 */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">
              기본 정보
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="ID" value={maskEmail(member.email)} />
              <InfoRow label="이름" value={maskName(member.name || '')} />
              <InfoRow label="휴대폰" value={member.phone ? maskPhone(member.phone) : '-'} />
              <InfoRow label="성별" value={getGenderLabel(member.gender)} />
              <InfoRow 
                label="생년월일" 
                value={member.birth_date ? formatDate(member.birth_date, 'YYYY-MM-DD') : '-'} 
              />
              <InfoRow label="회원구분" value={member.member_type} />
              <InfoRow label="사업장코드" value={member.business_code || '-'} />
              <InfoRow label="가입일" value={formatDate(member.created_at)} />
            </div>
          </section>

          {/* 건강 정보 */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">
              건강 정보
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow 
                label="키" 
                value={member.height ? `${member.height}cm` : '-'} 
              />
              <InfoRow 
                label="체중" 
                value={member.weight ? `${member.weight}kg` : '-'} 
              />
              <InfoRow 
                label="관심사" 
                value={member.interests?.length ? member.interests.join(', ') : '-'} 
              />
              <InfoRow 
                label="보유질환" 
                value={member.diseases?.length ? member.diseases.join(', ') : '-'} 
              />
            </div>
          </section>

          {/* 포인트/마케팅 정보 */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">
              포인트/마케팅
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow 
                label="보유포인트" 
                value={`${(member.total_points || 0).toLocaleString()}P`} 
              />
              <InfoRow 
                label="푸시 동의" 
                value={member.marketing_push_agreed ? '동의' : '미동의'} 
              />
              <InfoRow 
                label="SMS 동의" 
                value={member.marketing_sms_agreed ? '동의' : '미동의'} 
              />
              <InfoRow 
                label="최근 로그인" 
                value={member.last_login ? formatDate(member.last_login) : '-'} 
              />
            </div>
          </section>
        </div>
      ) : (
        <div className="py-8 text-center text-gray-500">
          회원 정보를 불러올 수 없습니다.
        </div>
      )}
    </Modal>
  );
}

// 정보 행 컴포넌트
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <span className="w-24 flex-shrink-0 text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}

