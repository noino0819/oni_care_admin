"use client";

// ============================================
// 건강목표 유형 등록/수정 모달 - 기획서 반영
// ============================================

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/common";
import { apiClient } from "@/lib/api-client";
import type { HealthGoalTypeListItem, HealthGoalTypeForm, OptionItem } from "@/types";

// BMI 범위 옵션
const BMI_RANGE_OPTIONS = [
  { value: "underweight", label: "저체중" },
  { value: "normal", label: "정상" },
  { value: "overweight", label: "과체중" },
  { value: "obese", label: "비만" },
];

interface TypeFormModalProps {
  isOpen: boolean;
  type: HealthGoalTypeListItem | null;
  diseases: OptionItem[];
  interests: OptionItem[];
  onClose: () => void;
  onSuccess: () => void;
}

const initialForm: HealthGoalTypeForm = {
  type_name: "",
  disease: "",
  bmi_range: "",
  interest_priority: "",
  is_active: null,
};

export function TypeFormModal({ isOpen, type, diseases, interests, onClose, onSuccess }: TypeFormModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<HealthGoalTypeForm>(initialForm);
  const [isLoading, setIsLoading] = useState(false);

  // 수정 모드일 때 데이터 로드
  useEffect(() => {
    if (isOpen && type) {
      setForm({
        type_name: type.type_name,
        disease: type.disease || "",
        bmi_range: type.bmi_range || "",
        interest_priority: type.interest_priority || "",
        is_active: type.is_active,
      });
    } else if (isOpen) {
      setForm(initialForm);
    }
  }, [isOpen, type]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  const handleChange = (key: keyof HealthGoalTypeForm, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    // 유효성 검사
    if (!form.type_name.trim()) {
      alert("유형명을 입력해주세요.");
      return;
    }
    if (form.type_name.trim().length > 10) {
      alert("유형명은 10자 이내로 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        type_name: form.type_name.trim(),
        disease: form.disease || null,
        bmi_range: form.bmi_range || null,
        interest_priority: form.interest_priority || null,
        is_active: form.is_active,
      };

      if (type) {
        await apiClient.put(`/admin/health-goal-types/${type.id}`, payload);
      } else {
        await apiClient.post("/admin/health-goal-types", payload);
      }
      onSuccess();
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const modal = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">{type ? "유형 수정" : "유형 등록"}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 폼 */}
        <div className="px-6 py-4 space-y-3">
          {/* 유형명 */}
          <div className="flex items-center gap-2 border border-gray-200 rounded overflow-hidden">
            <div className="w-[100px] h-[38px] flex items-center justify-center bg-gray-50 border-r border-gray-200 px-3">
              <span className="text-[14px] font-medium text-gray-700">유형명</span>
            </div>
            <input
              type="text"
              value={form.type_name}
              onChange={(e) => handleChange("type_name", e.target.value)}
              placeholder="10자 이내"
              maxLength={10}
              className="flex-1 h-[38px] px-3 text-[14px] bg-white focus:outline-none"
            />
          </div>

          {/* 질병 */}
          <div className="flex items-center gap-2 border border-gray-200 rounded overflow-hidden">
            <div className="w-[100px] h-[38px] flex items-center justify-center bg-gray-50 border-r border-gray-200 px-3">
              <span className="text-[14px] font-medium text-gray-700">질병</span>
            </div>
            <select
              value={form.disease}
              onChange={(e) => handleChange("disease", e.target.value)}
              className="flex-1 h-[38px] px-3 text-[14px] bg-white focus:outline-none appearance-none select-arrow"
            >
              <option value="">(선택)</option>
              {diseases.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* BMI 범위 */}
          <div className="flex items-center gap-2 border border-gray-200 rounded overflow-hidden">
            <div className="w-[100px] h-[38px] flex items-center justify-center bg-gray-50 border-r border-gray-200 px-3">
              <span className="text-[14px] font-medium text-gray-700">BMI 범위</span>
            </div>
            <select
              value={form.bmi_range}
              onChange={(e) => handleChange("bmi_range", e.target.value)}
              className="flex-1 h-[38px] px-3 text-[14px] bg-white focus:outline-none appearance-none select-arrow"
            >
              <option value="">(선택)</option>
              {BMI_RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 관심사 1순위 */}
          <div className="flex items-center gap-2 border border-gray-200 rounded overflow-hidden">
            <div className="w-[100px] h-[38px] flex items-center justify-center bg-gray-50 border-r border-gray-200 px-3">
              <span className="text-[14px] font-medium text-gray-700">관심사 1순위</span>
            </div>
            <select
              value={form.interest_priority}
              onChange={(e) => handleChange("interest_priority", e.target.value)}
              className="flex-1 h-[38px] px-3 text-[14px] bg-white focus:outline-none appearance-none select-arrow"
            >
              <option value="">(선택)</option>
              {interests.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 사용여부 */}
          <div className="flex items-center gap-2 border border-gray-200 rounded overflow-hidden">
            <div className="w-[100px] h-[38px] flex items-center justify-center bg-gray-50 border-r border-gray-200 px-3">
              <span className="text-[14px] font-medium text-gray-700">사용여부</span>
            </div>
            <div className="flex-1 flex items-center gap-4 px-3">
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active === true}
                  onChange={() => handleChange("is_active", true)}
                  className="w-4 h-4 border border-gray-300 rounded accent-[#737373]"
                />
                <span className="text-[13px] text-[#333]">Y</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active === false}
                  onChange={() => handleChange("is_active", false)}
                  className="w-4 h-4 border border-gray-300 rounded accent-[#737373]"
                />
                <span className="text-[13px] text-[#333]">N</span>
              </label>
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-center gap-3 px-6 py-4 border-t">
          <Button
            variant="secondary"
            onClick={onClose}
            className="min-w-[100px] bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            취소하기
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isLoading} className="min-w-[100px]">
            저장
          </Button>
        </div>
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(modal, document.body);
}

