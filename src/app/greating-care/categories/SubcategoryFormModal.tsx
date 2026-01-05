"use client";

// ============================================
// 중분류 등록/수정 모달
// ============================================

import { useState, useEffect } from "react";
import { Button, AlertModal } from "@/components/common";
import { X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type { ContentCategory, ContentSubcategory, SubcategoryForm } from "@/types";

interface SubcategoryFormModalProps {
  isOpen: boolean;
  subcategory: ContentSubcategory | null;
  categories: ContentCategory[];
  onClose: () => void;
  onSuccess: () => void;
}

const initialFormData: SubcategoryForm = {
  category_id: 0,
  subcategory_name: "",
  display_order: 1,
  is_active: true,
};

export function SubcategoryFormModal({
  isOpen,
  subcategory,
  categories,
  onClose,
  onSuccess,
}: SubcategoryFormModalProps) {
  const [formData, setFormData] = useState<SubcategoryForm>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    if (subcategory) {
      setFormData({
        category_id: subcategory.category_id,
        subcategory_name: subcategory.subcategory_name,
        display_order: subcategory.display_order,
        is_active: subcategory.is_active,
      });
    } else {
      setFormData({
        ...initialFormData,
        category_id: categories.length > 0 ? categories[0].id : 0,
      });
    }
  }, [subcategory, categories, isOpen]);

  const handleChange = (key: keyof SubcategoryForm, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): boolean => {
    if (!formData.category_id) {
      setAlertMessage("대분류를 선택해주세요.");
      return false;
    }
    if (!formData.subcategory_name.trim()) {
      setAlertMessage("중분류명을 입력해주세요.");
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
      if (subcategory) {
        await apiClient.put(`/admin/content-subcategories/${subcategory.id}`, formData);
      } else {
        await apiClient.post("/admin/content-subcategories", formData);
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
              {subcategory ? "중분류 수정" : "중분류 등록"}
            </h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-3">
            {/* 대분류 선택 */}
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <div className={labelClass}>대분류</div>
              <select
                value={formData.category_id}
                onChange={(e) => handleChange("category_id", parseInt(e.target.value))}
                className={selectClass}
              >
                <option value={0}>선택</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
            </div>

            {/* 중분류명 */}
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <div className={labelClass}>중분류명</div>
              <input
                type="text"
                value={formData.subcategory_name}
                onChange={(e) => handleChange("subcategory_name", e.target.value)}
                className={inputClass}
                placeholder="중분류명을 입력하세요"
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
              {subcategory ? "수정" : "등록"}
            </Button>
          </div>
        </div>
      </div>

      <AlertModal isOpen={!!alertMessage} onClose={() => setAlertMessage(null)} message={alertMessage || ""} />
    </>
  );
}


