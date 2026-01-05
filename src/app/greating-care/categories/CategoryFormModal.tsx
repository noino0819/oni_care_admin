"use client";

// ============================================
// 카테고리 등록/수정 모달 (대분류/중분류 공용)
// ============================================

import { useState, useEffect } from "react";
import { Button, AlertModal } from "@/components/common";
import { X } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface Category {
  id: number;
  category_type: string;
  category_name: string;
  parent_id: number | null;
  display_order: number;
  is_active: boolean;
}

interface CategoryFormModalProps {
  isOpen: boolean;
  category: Category | null;  // 수정할 카테고리 (null이면 신규 등록)
  parentId: number | null;     // 상위 카테고리 ID (null이면 대분류)
  parentName?: string;         // 상위 카테고리명 (표시용)
  onClose: () => void;
  onSuccess: () => void;
}

// 카테고리 타입 옵션 (대분류용)
const CATEGORY_TYPE_OPTIONS = [
  { value: "interest", label: "관심사" },
  { value: "disease", label: "질병" },
  { value: "exercise", label: "운동" },
];

interface CategoryFormData {
  category_type: string;
  category_name: string;
  parent_id: number | null;
  display_order: number;
  is_active: boolean;
}

const initialFormData: CategoryFormData = {
  category_type: "interest",
  category_name: "",
  parent_id: null,
  display_order: 1,
  is_active: true,
};

export function CategoryFormModal({ isOpen, category, parentId, parentName, onClose, onSuccess }: CategoryFormModalProps) {
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const isSubcategory = parentId !== null;

  useEffect(() => {
    if (category) {
      setFormData({
        category_type: category.category_type || "interest",
        category_name: category.category_name,
        parent_id: category.parent_id,
        display_order: category.display_order,
        is_active: category.is_active,
      });
    } else {
      setFormData({
        ...initialFormData,
        parent_id: parentId,
      });
    }
  }, [category, parentId, isOpen]);

  const handleChange = (key: keyof CategoryFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): boolean => {
    if (!formData.category_name.trim()) {
      setAlertMessage(isSubcategory ? "중분류명을 입력해주세요." : "대분류명을 입력해주세요.");
      return false;
    }
    if (formData.display_order < 1) {
      setAlertMessage("정렬순서는 1 이상이어야 합니다.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        parent_id: parentId,  // 중분류일 경우 상위 ID 설정
      };

      if (category) {
        await apiClient.put(`/admin/content-categories/${category.id}`, payload);
      } else {
        await apiClient.post("/admin/content-categories", payload);
      }

      onSuccess();
    } catch (error) {
      setAlertMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const labelClass =
    "w-[100px] min-h-[38px] flex items-center justify-center bg-gray-50 border-r border-gray-200 px-3 py-2 text-[14px] font-medium text-gray-700 text-center";
  const inputClass =
    "flex-1 h-[38px] px-3 border border-gray-200 rounded text-[14px] bg-white focus:outline-none focus:border-[#737373]";
  const selectClass =
    "flex-1 h-[38px] px-3 border border-gray-200 rounded text-[14px] bg-white appearance-none focus:outline-none focus:border-[#737373] select-arrow";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-bold text-gray-900">
              {category 
                ? (isSubcategory ? "중분류 수정" : "대분류 수정")
                : (isSubcategory ? "중분류 등록" : "대분류 등록")
              }
            </h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-3">
            {/* 상위 카테고리 (중분류일 때만 표시) */}
            {isSubcategory && parentName && (
              <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                <div className={labelClass}>대분류</div>
                <div className="flex-1 h-[38px] px-3 flex items-center text-[14px] bg-gray-50 text-gray-700">
                  {parentName}
                </div>
              </div>
            )}

            {/* 카테고리 타입 (대분류일 때만 표시) */}
            {!isSubcategory && (
              <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                <div className={labelClass}>분류유형</div>
                <select
                  value={formData.category_type}
                  onChange={(e) => handleChange("category_type", e.target.value)}
                  className={selectClass}
                >
                  {CATEGORY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 카테고리명 */}
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <div className={labelClass}>{isSubcategory ? "중분류명" : "대분류명"}</div>
              <input
                type="text"
                value={formData.category_name}
                onChange={(e) => handleChange("category_name", e.target.value)}
                className={inputClass}
                placeholder={isSubcategory ? "중분류명을 입력하세요" : "대분류명을 입력하세요"}
              />
            </div>

            {/* 정렬순서 */}
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <div className={labelClass}>정렬순서</div>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => handleChange("display_order", parseInt(e.target.value) || 1)}
                min={1}
                className={inputClass}
              />
            </div>

            {/* 사용여부 */}
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <div className={labelClass}>사용여부</div>
              <select
                value={formData.is_active ? "Y" : "N"}
                onChange={(e) => handleChange("is_active", e.target.value === "Y")}
                className={selectClass}
              >
                <option value="Y">Y</option>
                <option value="N">N</option>
              </select>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-center gap-3 px-6 py-4 border-t">
            <Button
              variant="secondary"
              onClick={onClose}
              className="min-w-[100px] bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              취소
            </Button>
            <Button variant="primary" onClick={handleSave} isLoading={isSaving} className="min-w-[100px]">
              {category ? "수정" : "등록"}
            </Button>
          </div>
        </div>
      </div>

      <AlertModal isOpen={!!alertMessage} onClose={() => setAlertMessage(null)} message={alertMessage || ""} />
    </>
  );
}
