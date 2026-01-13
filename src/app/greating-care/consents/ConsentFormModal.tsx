"use client";

// ============================================
// 동의서 등록/수정 모달 - 기획서 반영
// ============================================

import { useState, useEffect } from "react";
import { Button, AlertModal } from "@/components/common";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { apiClient } from "@/lib/api-client";

// 동의서 타입
interface ConsentListItem {
  id: string; // terms 테이블은 UUID
  consent_code: string;
  title: string;
  classification: "required" | "optional";
  exposure_location: string;
  content?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ConsentForm {
  title: string;
  classification: "required" | "optional" | "";
  exposure_location: string;
  content: string;
  is_active: boolean | null;
}

interface ConsentFormModalProps {
  isOpen: boolean;
  consent: ConsentListItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

// 노출위치 옵션
const EXPOSURE_LOCATION_OPTIONS = [
  { value: "signup", label: "회원가입" },
  { value: "notification_consent", label: "알림 수신동의" },
  { value: "privacy_policy", label: "개인정보 처리방침" },
  { value: "terms_of_service", label: "이용약관" },
];

const initialFormData: ConsentForm = {
  title: "",
  classification: "",
  exposure_location: "",
  content: "",
  is_active: null,
};

export function ConsentFormModal({
  isOpen,
  consent,
  onClose,
  onSuccess,
}: ConsentFormModalProps) {
  const [formData, setFormData] = useState<ConsentForm>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    if (consent) {
      // 상세 정보 로드
      fetchConsentDetail(consent.id);
    } else {
      setFormData(initialFormData);
    }
  }, [consent, isOpen]);

  const fetchConsentDetail = async (id: string) => {
    try {
      const response = await apiClient.get<ConsentListItem>(
        `/admin/consents/${id}`
      );
      if (response.success && response.data) {
        setFormData({
          title: response.data.title,
          classification: response.data.classification,
          exposure_location: response.data.exposure_location,
          content: response.data.content || "",
          is_active: response.data.is_active,
        });
      }
    } catch {
      setAlertMessage("동의서 정보를 불러오는데 실패했습니다.");
    }
  };

  const handleChange = (key: keyof ConsentForm, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): boolean => {
    if (!formData.title.trim()) {
      setAlertMessage("동의서명을 입력해주세요.");
      return false;
    }
    if (formData.title.trim().length > 30) {
      setAlertMessage("동의서명은 30자 이내로 입력해주세요.");
      return false;
    }
    if (!formData.classification) {
      setAlertMessage("분류를 선택해주세요.");
      return false;
    }
    if (!formData.exposure_location) {
      setAlertMessage("노출위치를 선택해주세요.");
      return false;
    }
    if (formData.is_active === null) {
      setAlertMessage("사용여부를 선택해주세요.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        classification: formData.classification,
        exposure_location: formData.exposure_location,
        content: formData.content.trim(),
        is_active: formData.is_active,
      };

      if (consent) {
        await apiClient.put(`/admin/consents/${consent.id}`, payload);
      } else {
        await apiClient.post("/admin/consents", payload);
      }

      onSuccess();
    } catch {
      setAlertMessage("저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const labelClass =
    "w-[100px] min-h-[38px] flex items-center justify-center bg-[#f5f5f5] border border-gray-200 px-3 py-2 text-[13px] font-medium text-gray-700 text-center";
  const inputClass =
    "flex-1 h-[38px] px-3 border border-gray-200 text-[13px] bg-white focus:outline-none focus:border-[#737373]";
  const checkboxClass =
    "w-4 h-4 border border-gray-300 rounded cursor-pointer accent-[#737373]";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
            <h2 className="text-lg font-bold text-gray-900">
              {consent ? "동의서 수정" : "동의서 등록"}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* 동의서 설정 */}
            <section>
              <h3 className="text-[15px] font-semibold text-gray-900 mb-3">
                동의서 설정
              </h3>
              <div className="space-y-0">
                {/* 첫 번째 행: 동의서명 + 노출위치 */}
                <div className="flex">
                  {/* 동의서명 */}
                  <div className="flex flex-1">
                    <div className={labelClass}>동의서명</div>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleChange("title", e.target.value)}
                      className={inputClass}
                      placeholder="30자 이내"
                      maxLength={30}
                    />
                  </div>
                  {/* 노출위치 */}
                  <div className="flex flex-1">
                    <div className={labelClass}>노출위치</div>
                    <select
                      value={formData.exposure_location}
                      onChange={(e) =>
                        handleChange("exposure_location", e.target.value)
                      }
                      className={cn(inputClass, "appearance-none select-arrow")}
                    >
                      <option value="">선택</option>
                      {EXPOSURE_LOCATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 두 번째 행: 분류 + 사용여부 */}
                <div className="flex">
                  {/* 분류 */}
                  <div className="flex flex-1">
                    <div className={labelClass}>분류</div>
                    <div className="flex-1 flex items-center gap-4 px-3 py-2 border border-gray-200 border-t-0">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.classification === "required"}
                          onChange={(e) =>
                            handleChange(
                              "classification",
                              e.target.checked ? "required" : ""
                            )
                          }
                          className={checkboxClass}
                        />
                        <span className="text-[13px] text-gray-700">필수</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.classification === "optional"}
                          onChange={(e) =>
                            handleChange(
                              "classification",
                              e.target.checked ? "optional" : ""
                            )
                          }
                          className={checkboxClass}
                        />
                        <span className="text-[13px] text-gray-700">선택</span>
                      </label>
                    </div>
                  </div>
                  {/* 사용여부 */}
                  <div className="flex flex-1">
                    <div className={cn(labelClass, "border-t-0")}>사용여부</div>
                    <div className="flex-1 flex items-center gap-4 px-3 py-2 border border-gray-200 border-t-0">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_active === true}
                          onChange={(e) =>
                            handleChange(
                              "is_active",
                              e.target.checked ? true : null
                            )
                          }
                          className={checkboxClass}
                        />
                        <span className="text-[13px] text-gray-700">Y</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_active === false}
                          onChange={(e) =>
                            handleChange(
                              "is_active",
                              e.target.checked ? false : null
                            )
                          }
                          className={checkboxClass}
                        />
                        <span className="text-[13px] text-gray-700">N</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 동의서 내용 */}
            <section>
              <h3 className="text-[15px] font-semibold text-gray-900 mb-3">
                동의서 내용
              </h3>
              <textarea
                value={formData.content}
                onChange={(e) => handleChange("content", e.target.value)}
                className="w-full h-[300px] px-3 py-3 border border-gray-200 rounded text-[13px] resize-none focus:outline-none focus:border-[#737373]"
                placeholder="약관내용 텍스트로 입력..."
              />
            </section>
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
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={isSaving}
              className="min-w-[100px]"
            >
              저장
            </Button>
          </div>
        </div>
      </div>

      <AlertModal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        message={alertMessage || ""}
      />
    </>
  );
}
