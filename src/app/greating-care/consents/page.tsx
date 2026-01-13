"use client";

// ============================================
// 동의내용 관리 페이지 - 기획서 반영
// ============================================

import { useState, useCallback, useMemo } from "react";
import { AdminLayout } from "@/components/layout";
import { Button, DataTable, Pagination, AlertModal, ConfirmModal, Checkbox } from "@/components/common";
import { ConsentFormModal } from "./ConsentFormModal";
import { cn } from "@/lib/utils";
import { RefreshCw, Plus, Trash2 } from "lucide-react";
import useSWR from "swr";
import { swrFetcher, apiClient } from "@/lib/api-client";
import type { SortConfig, TableColumn } from "@/types";

// 동의서 타입 정의
interface ConsentListItem {
  id: string;  // terms 테이블은 UUID
  consent_code: string;
  title: string;
  classification: "required" | "optional";
  exposure_location: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ConsentSearchFilters {
  title: string;
  classification: string[];
  exposure_location: string;
  is_active: string[];
}

// 노출위치 옵션
const EXPOSURE_LOCATION_OPTIONS = [
  { value: "signup", label: "회원가입" },
  { value: "notification_consent", label: "알림 수신동의" },
  { value: "privacy_policy", label: "개인정보 처리방침" },
  { value: "terms_of_service", label: "이용약관" },
];

// 분류 옵션
const CLASSIFICATION_OPTIONS = [
  { value: "required", label: "필수" },
  { value: "optional", label: "선택" },
];

// 사용여부 옵션
const ACTIVE_OPTIONS = [
  { value: "Y", label: "Y" },
  { value: "N", label: "N" },
];

export default function ConsentsPage() {
  const [filters, setFilters] = useState<ConsentSearchFilters>({
    title: "",
    classification: [],
    exposure_location: "",
    is_active: [],
  });

  const [sort, setSort] = useState<SortConfig>({ field: "consent_code", direction: "asc" });
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingConsent, setEditingConsent] = useState<ConsentListItem | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (filters.title) params.set("title", filters.title);
    if (filters.classification && filters.classification.length > 0) {
      params.set("classification", filters.classification.join(","));
    }
    if (filters.exposure_location) params.set("exposure_location", filters.exposure_location);
    if (filters.is_active && filters.is_active.length > 0) {
      params.set("is_active", filters.is_active.join(","));
    }
    params.set("page", String(page));
    params.set("limit", "20");
    if (sort.field) {
      params.set("sort_field", sort.field);
      params.set("sort_direction", sort.direction || "asc");
    }
    return params.toString();
  };

  const { data, isLoading, mutate } = useSWR<{
    success: boolean;
    data: ConsentListItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>(hasSearched ? `/admin/consents?${buildQueryString()}` : null, swrFetcher, { revalidateOnFocus: false });

  const consents = data?.data || [];
  const pagination = data?.pagination;

  const handleFilterChange = (key: keyof ConsentSearchFilters, value: string | string[]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setPage(1);
    setHasSearched(true);
    mutate();
  };

  const handleRefresh = () => {
    setFilters({
      title: "",
      classification: [],
      exposure_location: "",
      is_active: [],
    });
    setSort({ field: "consent_code", direction: "asc" });
    setPage(1);
    setSelectedIds([]);
    setHasSearched(false);
  };

  const handleSort = useCallback((field: string) => {
    setSort((prev) => {
      if (prev.field !== field) return { field, direction: "asc" };
      if (prev.direction === "asc") return { field, direction: "desc" };
      return { field: null, direction: null };
    });
  }, []);

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? consents.map((c) => c.id) : []);
  };

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((v) => v !== id)));
  };

  const handleAdd = () => {
    setEditingConsent(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (consent: ConsentListItem) => {
    setEditingConsent(consent);
    setIsFormModalOpen(true);
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      await apiClient.delete("/admin/consents/batch-delete", { ids: selectedIds });

      setAlertMessage("동의서가 삭제되었습니다.");
      setSelectedIds([]);
      mutate();
    } catch (error) {
      setAlertMessage(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    } finally {
      setConfirmDelete(false);
    }
  };

  const handleSaveSuccess = () => {
    setIsFormModalOpen(false);
    setEditingConsent(null);
    mutate();
  };

  const getClassificationLabel = (classification: string) => {
    return classification === "required" ? "필수" : "선택";
  };

  const getExposureLocationLabel = (location: string) => {
    const option = EXPOSURE_LOCATION_OPTIONS.find((o) => o.value === location);
    return option?.label || location;
  };

  const columns: TableColumn<ConsentListItem>[] = useMemo(
    () => [
      {
        key: "checkbox",
        label: () => (
          <Checkbox
            checked={selectedIds.length === consents.length && consents.length > 0}
            onChange={(e) => handleSelectAll(e.target.checked)}
          />
        ),
        sortable: false,
        align: "center",
        render: (_, row) => (
          <Checkbox
            checked={selectedIds.includes(row.id)}
            onChange={(e) => handleSelect(row.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      {
        key: "consent_code",
        label: "코드",
        sortable: true,
        width: "100px",
      },
      {
        key: "title",
        label: "동의서명",
        sortable: true,
      },
      {
        key: "classification",
        label: "분류",
        sortable: true,
        width: "100px",
        render: (value) => getClassificationLabel(value as string),
      },
      {
        key: "exposure_location",
        label: "노출위치",
        sortable: true,
        width: "150px",
        render: (value) => getExposureLocationLabel(value as string),
      },
      {
        key: "is_active",
        label: "사용여부",
        sortable: true,
        align: "center",
        width: "100px",
        render: (value) => (
          <span className={cn(value ? "text-[#d4a574]" : "text-gray-500")}>
            {value ? "Y" : "N"}
          </span>
        ),
      },
    ],
    [selectedIds, consents]
  );

  const inputClass =
    "h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] placeholder:text-gray-400";
  const selectClass =
    "h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white appearance-none focus:outline-none focus:border-[#666] select-arrow";
  const labelClass = "text-[13px] font-semibold text-[#333] whitespace-nowrap";
  const checkboxClass = "w-4 h-4 border border-gray-300 rounded cursor-pointer accent-[#737373]";

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[18px] font-bold text-black">동의내용 관리</h1>
            <span className="text-[13px] text-[#888]">그리팅 케어 &gt; 기타 &gt; 동의내용 관리</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSearch} size="sm">
              조회
            </Button>
            <Button
              variant="secondary"
              onClick={handleRefresh}
              size="sm"
              className="w-[32px] h-[28px] px-0 flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 조회조건 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {/* 동의서명 */}
            <div className="flex items-center gap-2">
              <span className={labelClass}>동의서명</span>
              <input
                type="text"
                value={filters.title}
                onChange={(e) => handleFilterChange("title", e.target.value)}
                className={cn(inputClass, "w-[180px]")}
              />
            </div>

            {/* 분류 */}
            <div className="flex items-center gap-2">
              <span className={labelClass}>분류</span>
              <div className="flex items-center gap-3">
                {CLASSIFICATION_OPTIONS.map((opt) => (
                  <label key={opt.value} className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.classification?.includes(opt.value)}
                      onChange={(e) => {
                        const current = filters.classification || [];
                        handleFilterChange(
                          "classification",
                          e.target.checked ? [...current, opt.value] : current.filter((v) => v !== opt.value)
                        );
                      }}
                      className={checkboxClass}
                    />
                    <span className="text-[13px] text-[#333]">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 노출위치 */}
            <div className="flex items-center gap-2">
              <span className={labelClass}>노출위치</span>
              <select
                value={filters.exposure_location}
                onChange={(e) => handleFilterChange("exposure_location", e.target.value)}
                className={cn(selectClass, "w-[180px]")}
              >
                <option value="">선택</option>
                {EXPOSURE_LOCATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 사용여부 */}
            <div className="flex items-center gap-2">
              <span className={labelClass}>사용여부</span>
              <div className="flex items-center gap-3">
                {ACTIVE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.is_active?.includes(opt.value)}
                      onChange={(e) => {
                        const current = filters.is_active || [];
                        handleFilterChange(
                          "is_active",
                          e.target.checked ? [...current, opt.value] : current.filter((v) => v !== opt.value)
                        );
                      }}
                      className={checkboxClass}
                    />
                    <span className="text-[13px] text-[#333]">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 데이터 테이블 */}
        <DataTable
          columns={columns}
          data={hasSearched ? consents : []}
          totalCount={pagination?.total}
          sorting={sort}
          onSort={handleSort}
          onRowClick={handleEdit}
          isLoading={isLoading && hasSearched}
          emptyMessage={hasSearched ? "조회 결과가 없습니다." : "조회조건을 입력하고 조회 버튼을 클릭해주세요."}
          getRowKey={(row) => row.id}
          title="동의서 목록"
          headerAction={
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  if (selectedIds.length === 0) {
                    setAlertMessage("삭제할 항목을 선택해주세요.");
                    return;
                  }
                  setConfirmDelete(true);
                }}
                className="flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                삭제
              </Button>
              <Button size="sm" onClick={handleAdd} className="flex items-center gap-1">
                <Plus className="w-3 h-3" />
                추가
              </Button>
            </div>
          }
        />

        {hasSearched && pagination && pagination.totalPages > 1 && (
          <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} />
        )}
      </div>

      <ConsentFormModal
        isOpen={isFormModalOpen}
        consent={editingConsent}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingConsent(null);
        }}
        onSuccess={handleSaveSuccess}
      />

      <AlertModal isOpen={!!alertMessage} onClose={() => setAlertMessage(null)} message={alertMessage || ""} />

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        message={`선택한 ${selectedIds.length}개 동의서를 삭제하시겠습니까?`}
        cancelText="취소"
        confirmText="삭제"
      />
    </AdminLayout>
  );
}

