'use client';

// ============================================
// 퀴즈 등록/수정 모달
// ============================================

import { useState, useEffect } from 'react';
import { Button, AlertModal } from '@/components/common';
import { X, Plus, Trash2 } from 'lucide-react';
import {
  useQuiz,
  createQuiz,
  updateQuiz,
  addQuizToChallenge,
  type ChallengeQuiz,
} from '@/hooks/useChallenges';

interface QuizFormModalProps {
  quizId: string | null;
  challengeId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// 초기 폼 데이터
const initialFormData = {
  quiz_name: '',
  quiz_type: 'multiple_choice' as 'multiple_choice' | 'ox',
  question: '',
  options: ['', '', '', '', ''],
  correct_answers: [] as number[],
  hint: '',
};

export function QuizFormModal({
  quizId,
  challengeId,
  isOpen,
  onClose,
  onSaved,
}: QuizFormModalProps) {
  const [formData, setFormData] = useState(initialFormData);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { quiz, isLoading } = useQuiz(quizId);

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (quiz && quizId) {
      setFormData({
        quiz_name: quiz.quiz_name,
        quiz_type: quiz.quiz_type,
        question: quiz.question,
        options: quiz.options,
        correct_answers: quiz.correct_answers,
        hint: quiz.hint || '',
      });
    } else if (!quizId) {
      setFormData(initialFormData);
    }
  }, [quiz, quizId]);

  // 모달 닫힐 때 초기화
  useEffect(() => {
    if (!isOpen) {
      setFormData(initialFormData);
    }
  }, [isOpen]);

  // 퀴즈 유형 변경 시 옵션 초기화
  useEffect(() => {
    if (formData.quiz_type === 'ox') {
      setFormData(prev => ({
        ...prev,
        options: ['O', 'X'],
        correct_answers: [],
      }));
    } else if (formData.quiz_type === 'multiple_choice' && formData.options.length !== 5) {
      setFormData(prev => ({
        ...prev,
        options: ['', '', '', '', ''],
        correct_answers: [],
      }));
    }
  }, [formData.quiz_type]);

  const handleChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    handleChange('options', newOptions);
  };

  const handleCorrectAnswerToggle = (index: number) => {
    const current = [...formData.correct_answers];
    if (current.includes(index)) {
      handleChange('correct_answers', current.filter(i => i !== index));
    } else {
      handleChange('correct_answers', [...current, index]);
    }
  };

  const handleSubmit = async () => {
    // 유효성 검사
    if (!formData.quiz_name.trim()) {
      setAlertMessage('퀴즈명을 입력해주세요.');
      return;
    }

    if (!formData.question.trim()) {
      setAlertMessage('문제를 입력해주세요.');
      return;
    }

    if (formData.quiz_type === 'multiple_choice') {
      const emptyOptions = formData.options.filter(opt => !opt.trim());
      if (emptyOptions.length > 0) {
        setAlertMessage('모든 선지를 입력해주세요.');
        return;
      }
    }

    if (formData.correct_answers.length === 0) {
      setAlertMessage('정답을 선택해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (quizId) {
        // 수정
        await updateQuiz(quizId, formData);
      } else {
        // 생성
        const newQuiz = await createQuiz(formData);
        
        // 챌린지에 연결
        if (challengeId && newQuiz.id) {
          await addQuizToChallenge(challengeId, newQuiz.id);
        }
      }

      onSaved();
    } catch (error: unknown) {
      const err = error as { message?: string };
      setAlertMessage(err?.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = 'h-[36px] px-3 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] placeholder:text-gray-400';
  const selectClass = 'h-[36px] px-3 border border-gray-300 rounded text-[13px] bg-white appearance-none focus:outline-none focus:border-[#666] select-arrow';
  const labelClass = 'text-[13px] font-semibold text-[#333] whitespace-nowrap min-w-[80px]';
  const checkboxClass = 'w-4 h-4 border border-gray-300 rounded cursor-pointer accent-[#737373]';

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-[18px] font-bold">
              {quizId ? '퀴즈 수정' : '퀴즈 등록'}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 콘텐츠 */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* 퀴즈명 */}
                <div className="flex items-center gap-4">
                  <span className={labelClass}>퀴즈명 *</span>
                  <input
                    type="text"
                    value={formData.quiz_name}
                    onChange={(e) => handleChange('quiz_name', e.target.value)}
                    className={`${inputClass} flex-1`}
                    placeholder="퀴즈명을 입력하세요"
                  />
                </div>

                {/* 퀴즈 유형 */}
                <div className="flex items-center gap-4">
                  <span className={labelClass}>퀴즈 유형 *</span>
                  <select
                    value={formData.quiz_type}
                    onChange={(e) => handleChange('quiz_type', e.target.value)}
                    className={`${selectClass} w-[150px]`}
                    disabled={!!quizId}
                  >
                    <option value="multiple_choice">다지선다</option>
                    <option value="ox">O/X</option>
                  </select>
                  {quizId && (
                    <span className="text-[12px] text-gray-500">※ 수정 시 유형 변경 불가</span>
                  )}
                </div>

                {/* 문제 */}
                <div className="flex items-start gap-4">
                  <span className={`${labelClass} pt-2`}>문제 *</span>
                  <textarea
                    value={formData.question}
                    onChange={(e) => handleChange('question', e.target.value)}
                    className="flex-1 p-3 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] min-h-[100px]"
                    placeholder="문제를 입력하세요"
                  />
                </div>

                {/* 선지 */}
                <div className="flex items-start gap-4">
                  <span className={`${labelClass} pt-2`}>선지 *</span>
                  <div className="flex-1 space-y-2">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.correct_answers.includes(index)}
                            onChange={() => handleCorrectAnswerToggle(index)}
                            className={checkboxClass}
                          />
                          <span className="text-[13px] text-[#333] w-[20px]">{index + 1}.</span>
                        </label>
                        {formData.quiz_type === 'ox' ? (
                          <span className="text-[13px] font-medium">{option}</span>
                        ) : (
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => handleOptionChange(index, e.target.value)}
                            className={`${inputClass} flex-1`}
                            placeholder={`선지 ${index + 1}`}
                          />
                        )}
                      </div>
                    ))}
                    <div className="text-[12px] text-gray-500 mt-2">
                      ※ 체크박스를 선택하여 정답을 지정하세요. (복수 선택 가능)
                    </div>
                  </div>
                </div>

                {/* 힌트 */}
                <div className="flex items-start gap-4">
                  <span className={`${labelClass} pt-2`}>힌트</span>
                  <textarea
                    value={formData.hint}
                    onChange={(e) => handleChange('hint', e.target.value)}
                    className="flex-1 p-3 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] min-h-[60px]"
                    placeholder="힌트를 입력하세요 (선택사항)"
                  />
                </div>
              </div>
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

      {/* 알럿 모달 */}
      <AlertModal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        message={alertMessage || ''}
      />
    </>
  );
}

