'use client';

// ============================================
// 포인트 상세 모달
// ============================================

import { Modal } from '@/components/common';
import { usePointDetail } from '@/hooks/usePoints';
import { formatDate, maskEmail, maskName } from '@/lib/utils';

interface PointDetailModalProps {
  pointId: string | null;
  onClose: () => void;
}

export function PointDetailModal({ pointId, onClose }: PointDetailModalProps) {
  const { point, isLoading } = usePointDetail(pointId);

  if (!pointId) return null;

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'earn': return '적립';
      case 'use': return '사용';
      case 'transfer': return '이관';
      case 'expire': return '소멸';
      default: return type;
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'earn': return 'text-green-600';
      case 'use': return 'text-red-600';
      case 'transfer': return 'text-blue-600';
      case 'expire': return 'text-gray-500';
      default: return '';
    }
  };

  return (
    <Modal
      isOpen={!!pointId}
      onClose={onClose}
      title="포인트 상세"
      size="sm"
    >
      {isLoading ? (
        <div className="py-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C8E600]" />
        </div>
      ) : point ? (
        <div className="space-y-4">
          {/* 회원 정보 */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">
              회원 정보
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="ID" value={maskEmail(point.email)} />
              <InfoRow label="고객명" value={maskName(point.email.split('@')[0] || '')} />
            </div>
          </section>

          {/* 거래 정보 */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">
              거래 정보
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex">
                <span className="w-24 flex-shrink-0 text-sm text-gray-500">유형</span>
                <span className={`text-sm font-medium ${getTransactionTypeColor(point.transaction_type)}`}>
                  {getTransactionTypeLabel(point.transaction_type)}
                </span>
              </div>
              <InfoRow label="적립/사용처" value={point.source} />
              <InfoRow label="상세내역" value={point.source_detail || '-'} />
              <div className="flex">
                <span className="w-24 flex-shrink-0 text-sm text-gray-500">포인트</span>
                <span className={`text-sm font-medium ${point.transaction_type === 'earn' ? 'text-green-600' : 'text-red-600'}`}>
                  {point.transaction_type === 'earn' ? '+' : ''}{(point.points ?? 0).toLocaleString()}P
                </span>
              </div>
              <InfoRow label="잔여포인트" value={`${(point.balance_after ?? 0).toLocaleString()}P`} />
              <InfoRow label="거래일시" value={formatDate(point.created_at, 'YYYY-MM-DD HH:mm:ss')} />
              <div className="flex">
                <span className="w-24 flex-shrink-0 text-sm text-gray-500">상태</span>
                {point.is_revoked ? (
                  <span className="text-sm text-gray-400">취소됨</span>
                ) : (
                  <span className="text-sm text-green-600">정상</span>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="py-8 text-center text-gray-500">
          포인트 정보를 불러올 수 없습니다.
        </div>
      )}
    </Modal>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex">
      <span className="w-24 flex-shrink-0 text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}


