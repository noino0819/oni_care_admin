'use client';

// ============================================
// 성분 및 함량 입력 팝업
// ============================================

import { useState, useEffect, useMemo } from 'react';
import { Modal, Button, AlertModal } from '@/components/common';
import { useFunctionalIngredients, type FunctionalIngredient } from '@/hooks/useFunctionalIngredients';
import { useSaveSupplementIngredients, type SupplementIngredient } from '@/hooks/useSupplements';
import { useDosageUnits } from '@/hooks/useUnits';
import { ChevronRight, ChevronLeft, Search } from 'lucide-react';

interface IngredientMappingModalProps {
  productId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  currentIngredients: SupplementIngredient[];
}

// 선택된 성분 타입
interface SelectedIngredient {
  ingredient_id: number;
  ingredient_code: string | null;
  internal_name: string;
  external_name: string;
  content_amount: number;
  content_unit: string;
  display_order: number;
  daily_intake_min: number | null;
  daily_intake_unit: string | null;
}

export function IngredientMappingModal({
  productId,
  isOpen,
  onClose,
  onSaved,
  currentIngredients,
}: IngredientMappingModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeft, setSelectedLeft] = useState<number[]>([]);
  const [selectedRight, setSelectedRight] = useState<number[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([]);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // 기능성 성분 목록 조회 (우선 노출 성분 포함)
  const { ingredients: allIngredients, isLoading } = useFunctionalIngredients(
    { search: searchTerm },
    1,
    100
  );

  // 단위 목록
  const { units: dosageUnits } = useDosageUnits();

  // 저장 mutation
  const { saveIngredients, isSaving } = useSaveSupplementIngredients(productId);

  // 모달 열릴 때 기존 매핑 데이터 로드
  useEffect(() => {
    if (isOpen && currentIngredients.length > 0) {
      setSelectedIngredients(
        currentIngredients.map((ing, idx) => ({
          ingredient_id: ing.ingredient_id,
          ingredient_code: ing.ingredient_code,
          internal_name: ing.internal_name,
          external_name: ing.external_name,
          content_amount: ing.content_amount,
          content_unit: ing.content_unit,
          display_order: idx,
          daily_intake_min: null,
          daily_intake_unit: null,
        }))
      );
    } else if (isOpen) {
      setSelectedIngredients([]);
    }
    setSelectedLeft([]);
    setSelectedRight([]);
    setSearchTerm('');
  }, [isOpen, currentIngredients]);

  // 이미 선택된 성분 ID 목록
  const selectedIngredientIds = useMemo(
    () => new Set(selectedIngredients.map(s => s.ingredient_id)),
    [selectedIngredients]
  );

  // 왼쪽 목록 (아직 선택되지 않은 성분만)
  const availableIngredients = useMemo(
    () => allIngredients.filter(ing => !selectedIngredientIds.has(ing.id)),
    [allIngredients, selectedIngredientIds]
  );

  // 오른쪽으로 이동 (선택 추가)
  const handleMoveRight = () => {
    if (selectedLeft.length === 0) return;

    const newIngredients: SelectedIngredient[] = [];
    selectedLeft.forEach(id => {
      const ing = allIngredients.find(i => i.id === id);
      if (ing) {
        newIngredients.push({
          ingredient_id: ing.id,
          ingredient_code: ing.ingredient_code,
          internal_name: ing.internal_name,
          external_name: ing.external_name,
          content_amount: ing.daily_intake_min || 0,
          content_unit: ing.daily_intake_unit || 'mg',
          display_order: selectedIngredients.length + newIngredients.length,
          daily_intake_min: ing.daily_intake_min,
          daily_intake_unit: ing.daily_intake_unit,
        });
      }
    });

    setSelectedIngredients(prev => [...prev, ...newIngredients]);
    setSelectedLeft([]);
  };

  // 왼쪽으로 이동 (선택 제거)
  const handleMoveLeft = () => {
    if (selectedRight.length === 0) return;

    setSelectedIngredients(prev =>
      prev.filter(ing => !selectedRight.includes(ing.ingredient_id))
    );
    setSelectedRight([]);
  };

  // 함량/단위 변경
  const handleIngredientChange = (
    ingredientId: number,
    field: 'content_amount' | 'content_unit',
    value: string
  ) => {
    setSelectedIngredients(prev =>
      prev.map(ing => {
        if (ing.ingredient_id === ingredientId) {
          return {
            ...ing,
            [field]: field === 'content_amount' ? parseFloat(value) || 0 : value,
          };
        }
        return ing;
      })
    );
  };

  // 저장
  const handleSave = async () => {
    if (!productId) return;

    try {
      await saveIngredients({
        ingredients: selectedIngredients.map((ing, idx) => ({
          ingredient_id: ing.ingredient_id,
          content_amount: ing.content_amount,
          content_unit: ing.content_unit,
          display_order: idx,
        })),
      });
      onSaved();
    } catch {
      setAlertMessage('저장 중 오류가 발생했습니다.');
    }
  };

  const inputClass = 'h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666]';
  const selectClass = 'h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white appearance-none focus:outline-none focus:border-[#666] select-arrow';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="성분 및 함량 입력"
        size="xl"
      >
        <div className="flex gap-4 py-2" style={{ minHeight: '500px' }}>
          {/* 왼쪽: 기능성 성분 검색/선택 */}
          <div className="flex-1 flex flex-col border border-gray-200 rounded-lg overflow-hidden">
            {/* 검색 */}
            <div className="p-3 bg-gray-50 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="성분명 검색"
                  className={`${inputClass} w-full pl-9`}
                />
              </div>
            </div>

            {/* 성분 목록 */}
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">로딩 중...</div>
              ) : availableIngredients.length === 0 ? (
                <div className="p-4 text-center text-gray-500">검색 결과가 없습니다.</div>
              ) : (
                <table className="w-full text-[13px]">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="w-10 px-2 py-2 text-center border-b">
                        <input
                          type="checkbox"
                          checked={selectedLeft.length > 0 && selectedLeft.length === availableIngredients.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLeft(availableIngredients.map(i => i.id));
                            } else {
                              setSelectedLeft([]);
                            }
                          }}
                          className="w-4 h-4 accent-[#737373]"
                        />
                      </th>
                      <th className="px-2 py-2 text-left border-b font-medium w-[60px]">코드</th>
                      <th className="px-2 py-2 text-left border-b font-medium">지표성분</th>
                      <th className="px-2 py-2 text-left border-b font-medium">성분명(내부)</th>
                      <th className="px-2 py-2 text-left border-b font-medium">성분명(외부)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableIngredients.map((ing) => (
                      <tr
                        key={ing.id}
                        className={`hover:bg-gray-50 cursor-pointer ${
                          selectedLeft.includes(ing.id) ? 'bg-blue-50' : ''
                        } ${ing.priority_display ? 'font-medium' : ''}`}
                        onClick={() => {
                          setSelectedLeft(prev =>
                            prev.includes(ing.id)
                              ? prev.filter(id => id !== ing.id)
                              : [...prev, ing.id]
                          );
                        }}
                      >
                        <td className="px-2 py-2 text-center border-b">
                          <input
                            type="checkbox"
                            checked={selectedLeft.includes(ing.id)}
                            onChange={() => {}}
                            className="w-4 h-4 accent-[#737373]"
                          />
                        </td>
                        <td className="px-2 py-2 border-b text-gray-600">{ing.ingredient_code || '-'}</td>
                        <td className="px-2 py-2 border-b">{ing.indicator_component || '-'}</td>
                        <td className="px-2 py-2 border-b">{ing.internal_name}</td>
                        <td className="px-2 py-2 border-b text-gray-600">{ing.external_name}</td>
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

          {/* 오른쪽: 선택된 성분 + 함량 입력 */}
          <div className="flex-1 flex flex-col border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-3 bg-gray-50 border-b">
              <span className="text-[13px] font-medium text-[#333]">
                선택된 성분 ({selectedIngredients.length}개)
              </span>
            </div>

            <div className="flex-1 overflow-auto">
              {selectedIngredients.length === 0 ? (
                <div className="p-4 text-center text-gray-500">왼쪽에서 성분을 선택해주세요.</div>
              ) : (
                <table className="w-full text-[13px]">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="w-10 px-2 py-2 text-center border-b">
                        <input
                          type="checkbox"
                          checked={selectedRight.length > 0 && selectedRight.length === selectedIngredients.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRight(selectedIngredients.map(i => i.ingredient_id));
                            } else {
                              setSelectedRight([]);
                            }
                          }}
                          className="w-4 h-4 accent-[#737373]"
                        />
                      </th>
                      <th className="px-2 py-2 text-left border-b font-medium">성분명</th>
                      <th className="w-[80px] px-2 py-2 text-left border-b font-medium">함량</th>
                      <th className="w-[70px] px-2 py-2 text-left border-b font-medium">단위</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedIngredients.map((ing) => (
                      <tr
                        key={ing.ingredient_id}
                        className={`hover:bg-gray-50 ${
                          selectedRight.includes(ing.ingredient_id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="px-2 py-2 text-center border-b">
                          <input
                            type="checkbox"
                            checked={selectedRight.includes(ing.ingredient_id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRight(prev => [...prev, ing.ingredient_id]);
                              } else {
                                setSelectedRight(prev => prev.filter(id => id !== ing.ingredient_id));
                              }
                            }}
                            className="w-4 h-4 accent-[#737373]"
                          />
                        </td>
                        <td className="px-2 py-2 border-b">
                          {ing.internal_name || ing.external_name}
                        </td>
                        <td className="px-2 py-2 border-b">
                          <input
                            type="number"
                            value={ing.content_amount}
                            onChange={(e) => handleIngredientChange(ing.ingredient_id, 'content_amount', e.target.value)}
                            className={`${inputClass} w-full text-right`}
                          />
                        </td>
                        <td className="px-2 py-2 border-b">
                          <select
                            value={ing.content_unit}
                            onChange={(e) => handleIngredientChange(ing.ingredient_id, 'content_unit', e.target.value)}
                            className={`${selectClass} w-full`}
                          >
                            {dosageUnits.map(unit => (
                              <option key={unit.id} value={unit.unit_value}>{unit.unit_value}</option>
                            ))}
                          </select>
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
            disabled={isSaving}
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

