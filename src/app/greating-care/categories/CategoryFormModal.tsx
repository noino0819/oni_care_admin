"use client";

// ============================================
// 대분류 등록/수정 모달
// ============================================

import { useState, useEffect } from "react";
import { Button, AlertModal } from "@/components/common";
import { X } from "lucide-react";
import type { ContentCategory, CategoryForm } from "@/types";

interface CategoryFormModalProps {
  isOpen: boolean;
  category: ContentCategory | null;
  onClose: () => void;
  onSuccess: () => void;
}

// 기획서 카테고리 옵션
const CATEGORY_TYPE_OPTIONS = [
  { value: "건강 상식", label: "건강 상식" },
  { value: "지금 챙기면 좋은 영양소", label: "지금 챙기면 좋은 영양소" },
  { value: "식단 레시피", label: "식단 레시피" },
  { value: "운동 레슨", label: "운동 레슨" },
  { value: "오늘의 스트레칭", label: "오늘의 스트레칭" },
  { value: "오늘의 명언", label: "오늘의 명언" },
];

const initialFormData: CategoryForm = {
  category_type: "",
  category_name: "",
  subcategory_types: "",
  display_order: 1,
  is_active: true,
};

export function CategoryFormModal({ isOpen, category, onClose, onSuccess }: CategoryFormModalProps) {
  const [formData, setFormData] = useState<CategoryForm>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    if (category) {
      setFormData({
        category_type: category.category_type,
        category_name: category.category_name,
        subcategory_types: category.subcategory_types || "",
        display_order: category.display_order,
        is_active: category.is_active,
      });
    } else {
      setFormData(initialFormData);
    }
  }, [category, isOpen]);

  const handleChange = (key: keyof CategoryForm, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): boolean => {
    if (!formData.category_name.trim()) {
      setAlertMessage("대분류명을 입력해주세요.");
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
      const token = localStorage.getItem("admin_token");
      const url = category ? `/api/admin/categories/${category.id}` : "/api/admin/categories";
      const method = category ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "저장에 실패했습니다.");
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
              {category ? "대분류 수정" : "대분류 등록"}
            </h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-3">
            {/* 카테고리 타입 */}
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <div className={labelClass}>카테고리 타입</div>
              <select
                value={formData.category_type}
                onChange={(e) => handleChange("category_type", e.target.value)}
                className={selectClass}
              >
                <option value="">선택</option>
                {CATEGORY_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 대분류명 */}
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <div className={labelClass}>대분류명</div>
              <input
                type="text"
                value={formData.category_name}
                onChange={(e) => handleChange("category_name", e.target.value)}
                className={inputClass}
                placeholder="대분류명을 입력하세요"
              />
            </div>

            {/* 세분류 종류 */}
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <div className={labelClass}>세분류 종류</div>
              <input
                type="text"
                value={formData.subcategory_types}
                onChange={(e) => handleChange("subcategory_types", e.target.value)}
                className={inputClass}
                placeholder="/ 구분 (예: 유형1/유형2/유형3)"
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


