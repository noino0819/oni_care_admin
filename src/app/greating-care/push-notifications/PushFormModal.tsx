"use client";

// ============================================
// PUSH 등록/수정 모달 - 기획서 반영
// ============================================

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X, Search } from "lucide-react";
import { Button } from "@/components/common";
import { apiClient, swrFetcher } from "@/lib/api-client";
import useSWR from "swr";
import type { PushNotificationListItem, PushNotificationForm, TargetCompany, SendTypeDetailOption } from "@/types";

// 전송대상 옵션
const TARGET_AUDIENCE_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "normal", label: "일반회원" },
  { value: "affiliate", label: "제휴사" },
  { value: "fs", label: "FS" },
];

// 발송유형 옵션
const SEND_TYPE_OPTIONS = [
  { value: "time_select", label: "시간 선택" },
  { value: "condition_met", label: "조건 달성 시" },
  { value: "system_time", label: "시스템 시간" },
];

interface PushFormModalProps {
  isOpen: boolean;
  push: PushNotificationListItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

const initialForm: PushNotificationForm = {
  push_name: "",
  target_audience: ["all"],
  target_companies: [],
  send_to_store: false,
  send_type: "",
  send_type_detail: "",
  send_time: "",
  content: "",
  link_url: "",
  is_active: null,
};

export function PushFormModal({ isOpen, push, onClose, onSuccess }: PushFormModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<PushNotificationForm>(initialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [selectedCompanies, setSelectedCompanies] = useState<TargetCompany[]>([]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  // 세부유형 옵션 조회
  const { data: sendTypeDetails } = useSWR<{ success: boolean; data: SendTypeDetailOption[] }>(
    form.send_type ? `/admin/push-notifications/send-type-details?send_type=${form.send_type}` : null,
    swrFetcher
  );

  // 기업 목록 조회
  const { data: companies } = useSWR<{ success: boolean; data: TargetCompany[] }>(
    companySearch ? `/admin/push-notifications/companies?search=${companySearch}` : null,
    swrFetcher
  );

  // 수정 모드일 때 데이터 로드
  useEffect(() => {
    if (isOpen && push) {
      setForm({
        push_name: push.push_name,
        target_audience: push.target_audience || ["all"],
        target_companies: push.target_companies || [],
        send_to_store: push.send_to_store,
        send_type: push.send_type || "",
        send_type_detail: push.send_type_detail || "",
        send_time: push.send_time || "",
        content: push.content || "",
        link_url: push.link_url || "",
        is_active: push.is_active,
      });
      // TODO: 기존 선택된 기업 목록 로드 필요 시 구현
    } else if (isOpen) {
      setForm(initialForm);
      setSelectedCompanies([]);
    }
  }, [isOpen, push]);

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

  const handleChange = (key: keyof PushNotificationForm, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTargetAudienceChange = (value: string, checked: boolean) => {
    setForm((prev) => {
      if (checked) {
        return { ...prev, target_audience: [...prev.target_audience, value] };
      }
      return { ...prev, target_audience: prev.target_audience.filter((v) => v !== value) };
    });
  };

  const handleCompanySelect = (company: TargetCompany) => {
    if (selectedCompanies.length >= 20) {
      return;
    }
    if (!selectedCompanies.find((c) => c.company_code === company.company_code)) {
      setSelectedCompanies((prev) => [...prev, company]);
      setForm((prev) => ({
        ...prev,
        target_companies: [...prev.target_companies, company.company_code],
      }));
    }
    setCompanySearch("");
    setShowCompanyDropdown(false);
  };

  const handleCompanyRemove = (companyCode: string) => {
    setSelectedCompanies((prev) => prev.filter((c) => c.company_code !== companyCode));
    setForm((prev) => ({
      ...prev,
      target_companies: prev.target_companies.filter((c) => c !== companyCode),
    }));
  };

  const handleSave = async () => {
    // 유효성 검사
    if (!form.push_name.trim()) {
      alert("푸시명을 입력해주세요.");
      return;
    }
    if (form.push_name.trim().length > 30) {
      alert("푸시명은 30자 이내로 입력해주세요.");
      return;
    }
    if (!form.send_type) {
      alert("발송유형을 선택해주세요.");
      return;
    }
    if (form.content && form.content.length > 50) {
      alert("내용은 50자 이내로 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        push_name: form.push_name.trim(),
        target_audience: form.target_audience,
        target_companies: form.target_companies,
        send_to_store: form.send_to_store,
        send_type: form.send_type,
        send_type_detail: form.send_type_detail || null,
        send_time: form.send_time || null,
        content: form.content.trim() || null,
        link_url: form.link_url.trim() || null,
        is_active: form.is_active,
      };

      if (push) {
        await apiClient.put(`/admin/push-notifications/${push.id}`, payload);
      } else {
        await apiClient.post("/admin/push-notifications", payload);
      }
      onSuccess();
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // FS 또는 제휴사가 선택되었는지 확인
  const showCompanySelector = form.target_audience.includes("fs") || form.target_audience.includes("affiliate");
  // 시스템 시간이 선택되었는지 확인 (시간 설정 활성화)
  const showTimeInput = form.send_type === "system_time";

  const modal = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">{push ? "푸시 수정" : "푸시 등록"}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 폼 */}
        <div className="px-6 py-4 space-y-4">
          {/* 푸시 설정 섹션 */}
          <div className="text-[15px] font-bold text-gray-800 mb-2">푸시 설정</div>

          <div className="grid grid-cols-2 gap-4">
            {/* 푸시명 */}
            <div className="flex items-center gap-2 border border-gray-200 rounded overflow-hidden">
              <div className="w-[120px] h-[38px] flex items-center justify-center bg-gray-50 border-r border-gray-200 px-3">
                <span className="text-[14px] font-medium text-gray-700">푸시명</span>
              </div>
              <input
                type="text"
                value={form.push_name}
                onChange={(e) => handleChange("push_name", e.target.value)}
                placeholder="30자 이내"
                maxLength={30}
                className="flex-1 h-[38px] px-3 text-[14px] bg-white focus:outline-none"
              />
            </div>

            {/* 발송유형 */}
            <div className="flex items-center gap-2 border border-gray-200 rounded overflow-hidden">
              <div className="w-[120px] h-[38px] flex items-center justify-center bg-gray-50 border-r border-gray-200 px-3">
                <span className="text-[14px] font-medium text-gray-700">발송유형</span>
              </div>
              <div className="flex-1 flex items-center gap-3 px-3">
                {SEND_TYPE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.send_type === opt.value}
                      onChange={(e) => handleChange("send_type", e.target.checked ? opt.value : "")}
                      className="w-4 h-4 border border-gray-300 rounded accent-[#737373]"
                    />
                    <span className="text-[13px] text-[#333]">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 전송대상 설정 */}
            <div className="flex items-center gap-2 border border-gray-200 rounded overflow-hidden">
              <div className="w-[120px] h-[38px] flex items-center justify-center bg-gray-50 border-r border-gray-200 px-3">
                <span className="text-[14px] font-medium text-gray-700">전송대상 설정</span>
              </div>
              <div className="flex-1 flex items-center gap-3 px-3">
                {TARGET_AUDIENCE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.target_audience.includes(opt.value)}
                      onChange={(e) => handleTargetAudienceChange(opt.value, e.target.checked)}
                      className="w-4 h-4 border border-gray-300 rounded accent-[#737373]"
                    />
                    <span className="text-[13px] text-[#333]">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 발송유형 세부설정 */}
            <div className="flex items-center gap-2 border border-gray-200 rounded overflow-hidden">
              <div className="w-[120px] h-[38px] flex items-center justify-center bg-gray-50 border-r border-gray-200 px-3">
                <span className="text-[14px] font-medium text-gray-700 text-center leading-tight">
                  발송유형 세부설정
                </span>
              </div>
              <select
                value={form.send_type_detail}
                onChange={(e) => handleChange("send_type_detail", e.target.value)}
                className="flex-1 h-[38px] px-3 text-[14px] bg-white focus:outline-none appearance-none select-arrow"
              >
                <option value="">선택</option>
                {sendTypeDetails?.data?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 전송대상 세부설정 (FS/제휴사 선택 시) */}
            {showCompanySelector && (
              <div className="col-span-2 flex items-start gap-2 border border-gray-200 rounded overflow-hidden">
                <div className="w-[120px] min-h-[80px] flex items-center justify-center bg-gray-50 border-r border-gray-200 px-3">
                  <span className="text-[14px] font-medium text-gray-700 text-center leading-tight">
                    전송대상 세부설정
                  </span>
                </div>
                <div className="flex-1 p-3">
                  <div className="relative mb-2">
                    <input
                      type="text"
                      value={companySearch}
                      onChange={(e) => {
                        setCompanySearch(e.target.value);
                        setShowCompanyDropdown(true);
                      }}
                      onFocus={() => setShowCompanyDropdown(true)}
                      placeholder="최대 20개 지점 선택 가능"
                      className="w-full h-[32px] px-3 pr-8 border border-gray-300 rounded text-[13px]"
                    />
                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    {showCompanyDropdown && companies?.data && companies.data.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-[200px] overflow-y-auto z-20">
                        {companies.data.map((company) => (
                          <div
                            key={company.company_code}
                            onClick={() => handleCompanySelect(company)}
                            className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex justify-between text-[13px]"
                          >
                            <span>{company.company_name}</span>
                            <span className="text-gray-500">{company.company_code}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedCompanies.map((company) => (
                      <span
                        key={company.company_code}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-[13px]"
                      >
                        {company.company_name}
                        <button onClick={() => handleCompanyRemove(company.company_code)} className="text-gray-500">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 시간 설정 (시스템 시간 선택 시) */}
            <div className="flex items-center gap-2 border border-gray-200 rounded overflow-hidden">
              <div className="w-[120px] h-[38px] flex items-center justify-center bg-gray-50 border-r border-gray-200 px-3">
                <span className="text-[14px] font-medium text-gray-700">시간 설정</span>
              </div>
              <input
                type="time"
                value={form.send_time}
                onChange={(e) => handleChange("send_time", e.target.value)}
                disabled={!showTimeInput}
                className={cn(
                  "flex-1 h-[38px] px-3 text-[14px] bg-white focus:outline-none",
                  !showTimeInput && "bg-gray-100 text-gray-400"
                )}
              />
            </div>

            {/* 스토어 전송여부 */}
            <div className="flex items-center gap-2 border border-gray-200 rounded overflow-hidden">
              <div className="w-[120px] h-[38px] flex items-center justify-center bg-gray-50 border-r border-gray-200 px-3">
                <span className="text-[14px] font-medium text-gray-700">스토어 전송여부</span>
              </div>
              <div className="flex-1 flex items-center gap-4 px-3">
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.send_to_store === true}
                    onChange={() => handleChange("send_to_store", true)}
                    className="w-4 h-4 border border-gray-300 rounded accent-[#737373]"
                  />
                  <span className="text-[13px] text-[#333]">Y</span>
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.send_to_store === false}
                    onChange={() => handleChange("send_to_store", false)}
                    className="w-4 h-4 border border-gray-300 rounded accent-[#737373]"
                  />
                  <span className="text-[13px] text-[#333]">N</span>
                </label>
              </div>
            </div>

            {/* 사용여부 */}
            <div className="flex items-center gap-2 border border-gray-200 rounded overflow-hidden">
              <div className="w-[120px] h-[38px] flex items-center justify-center bg-gray-50 border-r border-gray-200 px-3">
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

            {/* URL */}
            <div className="flex items-center gap-2 border border-gray-200 rounded overflow-hidden">
              <div className="w-[120px] h-[38px] flex items-center justify-center bg-gray-50 border-r border-gray-200 px-3">
                <span className="text-[14px] font-medium text-gray-700">URL</span>
              </div>
              <input
                type="text"
                value={form.link_url}
                onChange={(e) => handleChange("link_url", e.target.value)}
                placeholder="-"
                className="flex-1 h-[38px] px-3 text-[14px] bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* 내용 섹션 */}
          <div className="text-[15px] font-bold text-gray-800 mt-6 mb-2">내용</div>
          <div className="border border-gray-200 rounded">
            <textarea
              value={form.content}
              onChange={(e) => handleChange("content", e.target.value)}
              placeholder="50자 이내로 입력"
              maxLength={50}
              rows={4}
              className="w-full px-3 py-2 text-[14px] bg-white focus:outline-none resize-none"
            />
          </div>
          <p className="text-[12px] text-gray-500">
            * / 로 제목과 내용을 구분하여 입력 (예: 제목/내용)
            <br />* 이름이나 챌린지명이 들어가야 하는 부분은 {"{이름}"}, {"{챌린지명}"}으로 처리
          </p>
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

