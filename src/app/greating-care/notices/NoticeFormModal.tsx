"use client";

// ============================================
// 공지사항 등록/수정 모달 - 기획서 반영
// ============================================

import { useState, useEffect } from "react";
import { Button, AlertModal, DatePicker } from "@/components/common";
import { cn } from "@/lib/utils";
import { X, Upload } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type { NoticeListItem, NoticeForm } from "@/types";

interface NoticeFormModalProps {
  isOpen: boolean;
  notice: NoticeListItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EXPOSURE_SCOPE_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "normal", label: "일반회원" },
  { value: "affiliate", label: "제휴사" },
  { value: "fs", label: "FS" },
];

const initialFormData: NoticeForm = {
  title: "",
  content: "",
  image_url: null,
  visibility_scope: ["all"],
  company_codes: [],
  store_visible: false,
  start_date: "",
  end_date: "",
};

export function NoticeFormModal({ isOpen, notice, onClose, onSuccess }: NoticeFormModalProps) {
  const [formData, setFormData] = useState<NoticeForm>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [companyCodeInput, setCompanyCodeInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (notice) {
      setFormData({
        title: notice.title,
        content: "",
        image_url: null,
        visibility_scope: notice.visibility_scope,
        company_codes: notice.company_codes || [],
        store_visible: false,
        start_date: notice.start_date || "",
        end_date: notice.end_date || "",
      });
      // 상세 정보 로드
      fetchNoticeDetail(notice.id);
    } else {
      setFormData(initialFormData);
    }
    setCompanyCodeInput("");
  }, [notice, isOpen]);

  const fetchNoticeDetail = async (id: string) => {
    try {
      const response = await apiClient.get<NoticeListItem>(`/admin/notices/${id}`);
      if (response.success && response.data) {
        setFormData({
          title: response.data.title,
          content: response.data.content || "",
          image_url: response.data.image_url,
          visibility_scope: response.data.visibility_scope || ["all"],
          company_codes: response.data.company_codes || [],
          store_visible: response.data.store_visible || false,
          start_date: response.data.start_date || "",
          end_date: response.data.end_date || "",
        });
      }
    } catch (error) {
      console.error("공지사항 상세 조회 실패:", error);
    }
  };

  const handleChange = (key: keyof NoticeForm, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleScopeChange = (scope: string, checked: boolean) => {
    if (scope === "all") {
      handleChange("visibility_scope", checked ? ["all"] : []);
    } else {
      const current = formData.visibility_scope.filter((s) => s !== "all");
      if (checked) {
        handleChange("visibility_scope", [...current, scope]);
      } else {
        handleChange(
          "visibility_scope",
          current.filter((s) => s !== scope)
        );
      }
    }
  };

  const handleAddCompanyCode = () => {
    const code = companyCodeInput.trim().toUpperCase();
    if (!code) return;

    // 유효성 검사: 영문 + 숫자, 최대 20개
    if (!/^[A-Z0-9]+$/.test(code)) {
      setAlertMessage("기업/사업장 코드는 영문과 숫자만 입력 가능합니다.");
      return;
    }

    if (formData.company_codes.length >= 20) {
      setAlertMessage("기업/사업장 코드는 최대 20개까지 입력 가능합니다.");
      return;
    }

    if (formData.company_codes.includes(code)) {
      setAlertMessage("이미 추가된 코드입니다.");
      return;
    }

    handleChange("company_codes", [...formData.company_codes, code]);
    setCompanyCodeInput("");
  };

  const handleRemoveCompanyCode = (code: string) => {
    handleChange(
      "company_codes",
      formData.company_codes.filter((c) => c !== code)
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 검사 (예: 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAlertMessage("이미지 파일은 5MB 이하만 업로드 가능합니다.");
      return;
    }

    // 파일 타입 검사
    if (!file.type.startsWith("image/")) {
      setAlertMessage("이미지 파일만 업로드 가능합니다.");
      return;
    }

    setIsUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("folder", "notices");

      const token = localStorage.getItem("admin_token");
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/upload`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: formDataUpload,
      });

      if (!response.ok) {
        throw new Error("업로드에 실패했습니다.");
      }

      const data = await response.json();
      handleChange("image_url", data.data?.url || data.url);
    } catch (error) {
      setAlertMessage(error instanceof Error ? error.message : "업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  const validate = (): boolean => {
    if (!formData.title.trim()) {
      setAlertMessage("공지 제목을 입력해주세요.");
      return false;
    }
    if (formData.visibility_scope.length === 0) {
      setAlertMessage("노출 범위를 선택해주세요.");
      return false;
    }
    if (!formData.start_date || !formData.end_date) {
      setAlertMessage("공지 기간을 설정해주세요.");
      return false;
    }
    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      setAlertMessage("종료일은 시작일 이후여야 합니다.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      if (notice) {
        await apiClient.put(`/admin/notices/${notice.id}`, formData);
      } else {
        await apiClient.post("/admin/notices", formData);
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
    "w-[120px] min-h-[38px] flex items-center justify-center bg-gray-50 border-r border-gray-200 px-3 py-2 text-[14px] font-medium text-gray-700 text-center";
  const inputClass =
    "flex-1 h-[38px] px-3 border border-gray-200 rounded text-[14px] bg-white focus:outline-none focus:border-[#737373]";
  const checkboxClass = "w-4 h-4 border border-gray-300 rounded cursor-pointer accent-[#737373]";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
            <h2 className="text-lg font-bold text-gray-900">
              {notice ? "공지사항 수정" : "공지사항 등록"}
            </h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* 공지 설정 */}
            <section>
              <h3 className="text-[15px] font-semibold text-gray-900 mb-3">공지 설정</h3>
              <div className="space-y-3">
                {/* 공지 제목 */}
                <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                  <div className={labelClass}>공지 제목</div>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    className={inputClass}
                    placeholder="공지 제목을 입력하세요"
                  />
                </div>

                {/* 노출 범위 */}
                <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                  <div className={labelClass}>노출 범위</div>
                  <div className="flex-1 flex items-center gap-4 px-3 py-2">
                    {EXPOSURE_SCOPE_OPTIONS.map((opt) => (
                      <label key={opt.value} className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.visibility_scope.includes(opt.value)}
                          onChange={(e) => handleScopeChange(opt.value, e.target.checked)}
                          className={checkboxClass}
                        />
                        <span className="text-[14px] text-gray-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 상세 범위 */}
                <div className="flex items-start border border-gray-200 rounded overflow-hidden">
                  <div className={cn(labelClass, "min-h-[60px]")}>상세 범위</div>
                  <div className="flex-1 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={companyCodeInput}
                        onChange={(e) => setCompanyCodeInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleAddCompanyCode()}
                        className={cn(inputClass, "max-w-[200px]")}
                        placeholder="기업/사업장 코드"
                      />
                      <Button size="sm" onClick={handleAddCompanyCode}>
                        추가
                      </Button>
                      <span className="text-[12px] text-gray-500">
                        ({formData.company_codes.length}/20)
                      </span>
                    </div>
                    {formData.company_codes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.company_codes.map((code) => (
                          <span
                            key={code}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-[13px]"
                          >
                            {code}
                            <button
                              type="button"
                              onClick={() => handleRemoveCompanyCode(code)}
                              className="hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 스토어 공개여부 */}
                <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                  <div className={labelClass}>스토어 공개</div>
                  <div className="flex-1 px-3 py-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.store_visible}
                        onChange={(e) => handleChange("store_visible", e.target.checked)}
                        className={checkboxClass}
                      />
                      <span className="text-[14px] text-gray-700">스토어에 공개</span>
                    </label>
                  </div>
                </div>

                {/* 공지 기간 */}
                <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                  <div className={labelClass}>공지 기간</div>
                  <div className="flex-1 flex items-center gap-2 px-3 py-2">
                    <DatePicker
                      value={formData.start_date ? new Date(formData.start_date) : null}
                      onChange={(date) =>
                        handleChange("start_date", date ? date.toISOString().split("T")[0] : "")
                      }
                      placeholder="시작일"
                    />
                    <span className="text-gray-400">~</span>
                    <DatePicker
                      value={formData.end_date ? new Date(formData.end_date) : null}
                      onChange={(date) =>
                        handleChange("end_date", date ? date.toISOString().split("T")[0] : "")
                      }
                      placeholder="종료일"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 공지 이미지 */}
            <section>
              <h3 className="text-[15px] font-semibold text-gray-900 mb-3">공지 이미지</h3>
              <div className="border border-gray-200 rounded p-4">
                {formData.image_url ? (
                  <div className="relative inline-block">
                    <img
                      src={formData.image_url.startsWith('http') 
                        ? formData.image_url 
                        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}${formData.image_url}`}
                      alt="공지 이미지"
                      className="max-w-[300px] max-h-[200px] object-contain rounded"
                    />
                    <button
                      onClick={() => handleChange("image_url", null)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-[150px] border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                    {isUploading ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#737373]" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-[13px] text-gray-500">클릭하여 이미지 업로드</span>
                        <span className="text-[12px] text-gray-400 mt-1">최대 5MB</span>
                      </>
                    )}
                  </label>
                )}
              </div>
            </section>

            {/* 공지 내용 */}
            <section>
              <h3 className="text-[15px] font-semibold text-gray-900 mb-3">공지 내용</h3>
              <textarea
                value={formData.content}
                onChange={(e) => handleChange("content", e.target.value)}
                className="w-full h-[200px] px-3 py-2 border border-gray-200 rounded text-[14px] resize-none focus:outline-none focus:border-[#737373]"
                placeholder="공지 내용을 입력하세요"
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
            <Button variant="primary" onClick={handleSave} isLoading={isSaving} className="min-w-[100px]">
              {notice ? "수정" : "등록"}
            </Button>
          </div>
        </div>
      </div>

      <AlertModal isOpen={!!alertMessage} onClose={() => setAlertMessage(null)} message={alertMessage || ""} />
    </>
  );
}
