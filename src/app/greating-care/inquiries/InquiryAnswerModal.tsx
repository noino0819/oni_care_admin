'use client';

// ============================================
// 1:1 문의 답변 팝업 컴포넌트
// ============================================

import { useState, useEffect } from 'react';
import { Button, AlertModal } from '@/components/common';
import { useInquiryDetail, answerInquiry } from '@/hooks/useInquiries';
import { formatDate } from '@/lib/utils';
import { X } from 'lucide-react';

interface InquiryAnswerModalProps {
  inquiryId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function InquiryAnswerModal({ inquiryId, isOpen, onClose, onSaved }: InquiryAnswerModalProps) {
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const { inquiry, isLoading } = useInquiryDetail(inquiryId);

  // 모달 열릴 때 기존 답변 로드
  useEffect(() => {
    if (inquiry?.answer) {
      setAnswer(inquiry.answer);
    } else {
      setAnswer('');
    }
  }, [inquiry]);

  const handleSubmit = async () => {
    if (!inquiryId) return;
    
    if (!answer.trim()) {
      setAlertMessage('답변 내용을 입력해주세요.');
      return;
    }

    if (answer.length > 300) {
      setAlertMessage('답변은 300자 이내로 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await answerInquiry(inquiryId, answer.trim());
      onSaved();
    } catch {
      setAlertMessage('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAnswer('');
    onClose();
  };

  if (!isOpen) return null;

  const labelClass = 'text-[13px] font-medium text-[#333] bg-gray-100 px-4 py-3 min-w-[100px] text-center';
  const valueClass = 'text-[13px] text-[#333] px-4 py-3';

  // 스켈레톤 로딩 UI
  const renderSkeleton = () => (
    <div className="animate-pulse space-y-4">
      <div className="border border-gray-200 rounded">
        <table className="w-full">
          <tbody>
            <tr className="border-b border-gray-200">
              <td className={labelClass}><div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div></td>
              <td className={valueClass}><div className="h-4 bg-gray-200 rounded w-24"></div></td>
              <td className={labelClass}><div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div></td>
              <td className={valueClass}><div className="h-4 bg-gray-200 rounded w-32"></div></td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className={labelClass}><div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div></td>
              <td className={valueClass}><div className="h-4 bg-gray-200 rounded w-24"></div></td>
              <td className={labelClass}><div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div></td>
              <td className={valueClass}><div className="h-4 bg-gray-200 rounded w-24"></div></td>
            </tr>
            <tr>
              <td className={labelClass}><div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div></td>
              <td colSpan={3} className={`${valueClass} min-h-[100px]`}>
                <div className="h-20 bg-gray-200 rounded"></div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <>
      {/* 모달 오버레이 */}
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        {/* 모달 컨테이너 */}
        <div className="bg-white rounded-lg shadow-xl w-full max-w-[700px] mx-4">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-[18px] font-bold text-black">1:1 문의 답변</h2>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* 본문 */}
          <div className="px-6 py-4 space-y-6">
            {isLoading ? renderSkeleton() : (
              <>
                {/* 고객 문의 내용 영역 */}
                <div>
                  <h3 className="text-[14px] font-bold text-black mb-3">고객 문의 내용</h3>
                  <div className="border border-gray-200 rounded">
                    <table className="w-full">
                      <tbody>
                        <tr className="border-b border-gray-200">
                          <td className={labelClass}>고객명</td>
                          <td className={valueClass}>{inquiry?.customer_name_masked || '-'}</td>
                          <td className={labelClass}>고객 ID</td>
                          <td className={valueClass}>{inquiry?.customer_id_masked || '-'}</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className={labelClass}>문의 유형</td>
                          <td className={valueClass}>{inquiry?.inquiry_type_name || '-'}</td>
                          <td className={labelClass}>등록일</td>
                          <td className={valueClass}>{inquiry?.created_at ? formatDate(inquiry.created_at, 'YYYY.MM.DD') : '-'}</td>
                        </tr>
                        <tr>
                          <td className={`${labelClass} align-top`}>문의 내용</td>
                          <td colSpan={3} className={`${valueClass} min-h-[100px]`}>
                            <div className="whitespace-pre-wrap text-gray-600 max-h-[150px] overflow-y-auto pr-2">
                              {inquiry?.content || '-'}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 답변 영역 */}
                <div>
                  <h3 className="text-[14px] font-bold text-black mb-3">답변</h3>
                  <div className="border border-gray-200 rounded">
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="답변 내용을 텍스트로 입력 (300자)"
                      maxLength={300}
                      className="w-full h-[150px] px-4 py-3 text-[13px] text-[#333] resize-none focus:outline-none placeholder:text-gray-400"
                    />
                  </div>
                  <div className="text-right text-[12px] text-gray-500 mt-1">
                    {answer.length}/300자
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 푸터 */}
          <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={handleClose}
              size="md"
              className="w-[100px]"
            >
              취소하기
            </Button>
            <Button
              onClick={handleSubmit}
              size="md"
              className="w-[100px]"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </div>

      {/* 알럿 모달 */}
      <AlertModal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        message={alertMessage || ''}
      />
    </>
  );
}

