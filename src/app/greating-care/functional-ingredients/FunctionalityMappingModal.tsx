'use client';

// ============================================
// 기능성 내용 매핑 팝업
// ============================================

import { useState, useEffect, useMemo } from 'react';
import { Modal, Button, AlertModal } from '@/components/common';
import {
  useFunctionalityContents,
  useAddIngredientFunctionalities,
  type IngredientFunctionality,
  type FunctionalityContent,
} from '@/hooks/useFunctionalIngredients';
import { ChevronRight, ChevronLeft, Search } from 'lucide-react';

interface FunctionalityMappingModalProps {
  ingredientId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  currentFunctionalities: IngredientFunctionality[];
}

export function FunctionalityMappingModal({
  ingredientId,
  isOpen,
  onClose,
  onSaved,
  currentFunctionalities,
}: FunctionalityMappingModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeft, setSelectedLeft] = useState<number[]>([]);
  const [selectedRight, setSelectedRight] = useState<number[]>([]);
  const [selectedFunctionalities, setSelectedFunctionalities] = useState<FunctionalityContent[]>([]);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // 기능성 내용 목록 조회
  const { contents: allContents, isLoading } = useFunctionalityContents(searchTerm, 1, 100);

  // 저장 mutation
  const { addFunctionalities, isAdding } = useAddIngredientFunctionalities(ingredientId);

  // 모달 열릴 때 기존 매핑 데이터 로드
  useEffect(() => {
    if (isOpen && currentFunctionalities.length > 0) {
      setSelectedFunctionalities(
        currentFunctionalities.map(func => ({
          id: func.functionality_id,
          functionality_code: func.functionality_code,
          content: func.content,
          description: null,
          is_active: true,
          created_at: '',
          updated_at: '',
        }))
      );
    } else if (isOpen) {
      setSelectedFunctionalities([]);
    }
    setSelectedLeft([]);
    setSelectedRight([]);
    setSearchTerm('');
  }, [isOpen, currentFunctionalities]);

  // 이미 선택된 기능성 ID 목록
  const selectedFunctionalityIds = useMemo(
    () => new Set(selectedFunctionalities.map(s => s.id)),
    [selectedFunctionalities]
  );

  // 왼쪽 목록 (아직 선택되지 않은 기능성만)
  const availableFunctionalities = useMemo(
    () => allContents.filter(func => !selectedFunctionalityIds.has(func.id)),
    [allContents, selectedFunctionalityIds]
  );

  // 오른쪽으로 이동 (선택 추가)
  const handleMoveRight = () => {
    if (selectedLeft.length === 0) return;

    const newFunctionalities: FunctionalityContent[] = [];
    selectedLeft.forEach(id => {
      const func = allContents.find(f => f.id === id);
      if (func) {
        newFunctionalities.push(func);
      }
    });

    setSelectedFunctionalities(prev => [...prev, ...newFunctionalities]);
    setSelectedLeft([]);
  };

  // 왼쪽으로 이동 (선택 제거)
  const handleMoveLeft = () => {
    if (selectedRight.length === 0) return;

    setSelectedFunctionalities(prev =>
      prev.filter(func => !selectedRight.includes(func.id))
    );
    setSelectedRight([]);
  };

  // 저장
  const handleSave = async () => {
    if (!ingredientId) return;

    try {
      await addFunctionalities({
        functionality_ids: selectedFunctionalities.map(f => f.id),
      });
      onSaved();
    } catch {
      setAlertMessage('저장 중 오류가 발생했습니다.');
    }
  };

  const inputClass = 'h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666]';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="기능성 내용 매핑"
        size="xl"
      >
        <div className="flex gap-4 py-2" style={{ minHeight: '500px' }}>
          {/* 왼쪽: 기능성 내용 검색/선택 */}
          <div className="flex-1 flex flex-col border border-gray-200 rounded-lg overflow-hidden">
            {/* 검색 */}
            <div className="p-3 bg-gray-50 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="기능성 내용 검색"
                  className={`${inputClass} w-full pl-9`}
                />
              </div>
            </div>

            {/* 기능성 목록 */}
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">로딩 중...</div>
              ) : availableFunctionalities.length === 0 ? (
                <div className="p-4 text-center text-gray-500">검색 결과가 없습니다.</div>
              ) : (
                <table className="w-full text-[13px]">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="w-10 px-2 py-2 text-center border-b">
                        <input
                          type="checkbox"
                          checked={selectedLeft.length > 0 && selectedLeft.length === availableFunctionalities.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLeft(availableFunctionalities.map(f => f.id));
                            } else {
                              setSelectedLeft([]);
                            }
                          }}
                          className="w-4 h-4 accent-[#737373]"
                        />
                      </th>
                      <th className="w-20 px-2 py-2 text-left border-b font-medium">코드</th>
                      <th className="px-2 py-2 text-left border-b font-medium">기능성 내용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableFunctionalities.map((func) => (
                      <tr
                        key={func.id}
                        className={`hover:bg-gray-50 cursor-pointer ${
                          selectedLeft.includes(func.id) ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => {
                          setSelectedLeft(prev =>
                            prev.includes(func.id)
                              ? prev.filter(id => id !== func.id)
                              : [...prev, func.id]
                          );
                        }}
                      >
                        <td className="px-2 py-2 text-center border-b">
                          <input
                            type="checkbox"
                            checked={selectedLeft.includes(func.id)}
                            onChange={() => {}}
                            className="w-4 h-4 accent-[#737373]"
                          />
                        </td>
                        <td className="px-2 py-2 border-b text-gray-600">{func.functionality_code}</td>
                        <td className="px-2 py-2 border-b">
                          <span className="line-clamp-2">{func.content}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* 가운데: 이동 버튼 */}
          <div className="flex flex-col justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleMoveRight}
              disabled={selectedLeft.length === 0}
              className="w-10 h-10 p-0 flex items-center justify-center"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleMoveLeft}
              disabled={selectedRight.length === 0}
              className="w-10 h-10 p-0 flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>

          {/* 오른쪽: 선택된 기능성 내용 */}
          <div className="flex-1 flex flex-col border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-3 bg-gray-50 border-b">
              <span className="text-[13px] font-medium text-[#333]">
                선택된 기능성 내용 ({selectedFunctionalities.length}개)
              </span>
            </div>

            <div className="flex-1 overflow-auto">
              {selectedFunctionalities.length === 0 ? (
                <div className="p-4 text-center text-gray-500">왼쪽에서 기능성 내용을 선택해주세요.</div>
              ) : (
                <table className="w-full text-[13px]">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="w-10 px-2 py-2 text-center border-b">
                        <input
                          type="checkbox"
                          checked={selectedRight.length > 0 && selectedRight.length === selectedFunctionalities.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRight(selectedFunctionalities.map(f => f.id));
                            } else {
                              setSelectedRight([]);
                            }
                          }}
                          className="w-4 h-4 accent-[#737373]"
                        />
                      </th>
                      <th className="w-20 px-2 py-2 text-left border-b font-medium">코드</th>
                      <th className="px-2 py-2 text-left border-b font-medium">기능성 내용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedFunctionalities.map((func) => (
                      <tr
                        key={func.id}
                        className={`hover:bg-gray-50 ${
                          selectedRight.includes(func.id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="px-2 py-2 text-center border-b">
                          <input
                            type="checkbox"
                            checked={selectedRight.includes(func.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRight(prev => [...prev, func.id]);
                              } else {
                                setSelectedRight(prev => prev.filter(id => id !== func.id));
                              }
                            }}
                            className="w-4 h-4 accent-[#737373]"
                          />
                        </td>
                        <td className="px-2 py-2 border-b text-gray-600">{func.functionality_code}</td>
                        <td className="px-2 py-2 border-b">
                          <span className="line-clamp-2">{func.content}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={isAdding}
          >
            {isAdding ? '저장 중...' : '저장'}
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

