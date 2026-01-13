"use client";

// ============================================
// 건강목표 유형 관리 페이지 - 기획서 반영
// ============================================

import { useState, useCallback, useMemo } from "react";
import { AdminLayout } from "@/components/layout";
import { Button, DataTable, Pagination, AlertModal, ConfirmModal, Checkbox } from "@/components/common";
import { TypeFormModal } from "./TypeFormModal";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import useSWR from "swr";
import { swrFetcher, apiClient } from "@/lib/api-client";
import type { SortConfig, TableColumn, HealthGoalTypeListItem, HealthGoalTypeSearchFilters, OptionItem } from "@/types";

// BMI 범위 옵션
const BMI_RANGE_OPTIONS = [
  { value: "underweight", label: "저체중" },
  { value: "normal", label: "정상" },
  { value: "overweight", label: "과체중" },
  { value: "obese", label: "비만" },
];

export default function HealthGoalTypesPage() {
  const [filters, setFilters] = useState<HealthGoalTypeSearchFilters>({
    type_name: "",
    disease: "",
    bmi_range: "",
    interest_priority: "",
    is_active: [],
  });

  const [sort, setSort] = useState<SortConfig>({ field: "created_at", direction: "desc" });
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<HealthGoalTypeListItem | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hasSearched, setHasSearched] = useState(true);

  // 질병 목록 조회
  const { data: diseases } = useSWR<{ success: boolean; data: OptionItem[] }>(
    "/admin/health-goal-types/diseases",
    swrFetcher
  );

  // 관심사 목록 조회
  const { data: interests } = useSWR<{ success: boolean; data: OptionItem[] }>(
    "/admin/health-goal-types/interests",
    swrFetcher
  );

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (filters.type_name) params.set("type_name", filters.type_name);
    if (filters.disease) params.set("disease", filters.disease);
    if (filters.bmi_range) params.set("bmi_range", filters.bmi_range);
    if (filters.interest_priority) params.set("interest_priority", filters.interest_priority);
    if (filters.is_active && filters.is_active.length > 0) params.set("is_active", filters.is_active.join(","));
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
    data: HealthGoalTypeListItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>(hasSearched ? `/admin/health-goal-types?${buildQueryString()}` : null, swrFetcher, { revalidateOnFocus: false });

  const typeList = data?.data || [];
  const pagination = data?.pagination;

  const handleFilterChange = (key: keyof HealthGoalTypeSearchFilters, value: string | string[]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setPage(1);
    setHasSearched(true);
    mutate();
  };

  const handleRefresh = () => {
    setFilters({
      type_name: "",
      disease: "",
      bmi_range: "",
      interest_priority: "",
      is_active: [],
    });
    setSort({ field: "created_at", direction: "desc" });
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
    setSelectedIds(checked ? typeList.map((t) => t.id) : []);
  };

  const handleSelect = (id: number, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((v) => v !== id)));
  };

  const handleAdd = () => {
    setEditingType(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (type: HealthGoalTypeListItem) => {
    setEditingType(type);
    setIsFormModalOpen(true);
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      await apiClient.post("/admin/health-goal-types/batch-delete", { ids: selectedIds });

      setAlertMessage("건강목표 유형이 삭제되었습니다.");
      setSelectedIds([]);
      mutate();
    } catch {
      setAlertMessage("삭제에 실패했습니다.");
    } finally {
      setConfirmDelete(false);
    }
  };

  const handleSaveSuccess = () => {
    setIsFormModalOpen(false);
    setEditingType(null);
    mutate();
  };

  const getDiseaseLabel = (disease: string | null) => {
    if (!disease) return "-";
    const opt = diseases?.data?.find((d) => d.value === disease);
    return opt?.label || disease;
  };

  const getBmiRangeLabel = (bmiRange: string | null) => {
    if (!bmiRange) return "-";
    const opt = BMI_RANGE_OPTIONS.find((b) => b.value === bmiRange);
    return opt?.label || bmiRange;
  };

  const getInterestLabel = (interest: string | null) => {
    if (!interest) return "-";
    if (interest === "all") return "전체";
    const opt = interests?.data?.find((i) => i.value === interest);
    return opt?.label || interest;
  };

  const columns: TableColumn<HealthGoalTypeListItem>[] = useMemo(
    () => [
      {
        key: "checkbox",
        label: () => (
          <Checkbox
            checked={selectedIds.length === typeList.length && typeList.length > 0}
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
        key: "type_name",
        label: "유형명",
        sortable: true,
      },
      {
        key: "disease",
        label: "질병",
        sortable: true,
        render: (value) => getDiseaseLabel(value as string | null),
      },
      {
        key: "bmi_range",
        label: "BMI",
        sortable: true,
        render: (value) => getBmiRangeLabel(value as string | null),
      },
      {
        key: "interest_priority",
        label: "관심사 1순위",
        sortable: true,
        render: (value) => getInterestLabel(value as string | null),
      },
      {
        key: "is_active",
        label: "사용여부",
        sortable: true,
        align: "center",
        render: (value) => {
          const isActive = value as boolean;
          return (
            <span className={cn("px-2 py-1 rounded text-[12px] font-medium", isActive ? "text-green-700" : "text-red-700")}>
              {isActive ? "Y" : "N"}
            </span>
          );
        },
      },
    ],
    [selectedIds, typeList, diseases, interests]
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
            <h1 className="text-[18px] font-bold text-black">건강목표 유형 관리</h1>
            <span className="text-[13px] text-[#888]">그리팅 케어 &gt; 기타 &gt; 건강목표 유형 관리</span>
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
            <div className="flex items-center gap-2">
              <span className={labelClass}>유형명</span>
              <input
                type="text"
                value={filters.type_name}
                onChange={(e) => handleFilterChange("type_name", e.target.value)}
                className={cn(inputClass, "w-[180px]")}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>질병</span>
              <select
                value={filters.disease || ""}
                onChange={(e) => handleFilterChange("disease", e.target.value)}
                className={cn(selectClass, "w-[180px]")}
              >
                <option value="">전체</option>
                {diseases?.data?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>BMI</span>
              <select
                value={filters.bmi_range || ""}
                onChange={(e) => handleFilterChange("bmi_range", e.target.value)}
                className={cn(selectClass, "w-[150px]")}
              >
                <option value="">전체</option>
                {BMI_RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-3">
            <div className="flex items-center gap-2">
              <span className={labelClass}>관심사 1순위</span>
              <select
                value={filters.interest_priority || ""}
                onChange={(e) => handleFilterChange("interest_priority", e.target.value)}
                className={cn(selectClass, "w-[180px]")}
              >
                <option value="">전체</option>
                {interests?.data?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>사용여부</span>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.is_active?.includes("Y")}
                    onChange={(e) => {
                      const current = filters.is_active || [];
                      handleFilterChange(
                        "is_active",
                        e.target.checked ? [...current, "Y"] : current.filter((v) => v !== "Y")
                      );
                    }}
                    className={checkboxClass}
                  />
                  <span className="text-[13px] text-[#333]">Y</span>
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.is_active?.includes("N")}
                    onChange={(e) => {
                      const current = filters.is_active || [];
                      handleFilterChange(
                        "is_active",
                        e.target.checked ? [...current, "N"] : current.filter((v) => v !== "N")
                      );
                    }}
                    className={checkboxClass}
                  />
                  <span className="text-[13px] text-[#333]">N</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 데이터 테이블 */}
        <DataTable
          columns={columns}
          data={hasSearched ? typeList : []}
          totalCount={pagination?.total}
          sorting={sort}
          onSort={handleSort}
          onRowClick={handleEdit}
          isLoading={isLoading && hasSearched}
          emptyMessage={hasSearched ? "조회 결과가 없습니다." : "조회조건을 입력하고 조회 버튼을 클릭해주세요."}
          getRowKey={(row) => row.id}
          title="유형 리스트"
          headerAction={
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (selectedIds.length === 0) {
                    setAlertMessage("삭제할 항목을 선택해주세요.");
                    return;
                  }
                  setConfirmDelete(true);
                }}
                className="flex items-center gap-1"
              >
                삭제
              </Button>
              <Button size="sm" variant="secondary" onClick={handleAdd} className="flex items-center gap-1">
                추가
              </Button>
            </div>
          }
        />

        {hasSearched && pagination && pagination.totalPages > 1 && (
          <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} />
        )}
      </div>

      <TypeFormModal
        isOpen={isFormModalOpen}
        type={editingType}
        diseases={diseases?.data || []}
        interests={interests?.data || []}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingType(null);
        }}
        onSuccess={handleSaveSuccess}
      />

      <AlertModal isOpen={!!alertMessage} onClose={() => setAlertMessage(null)} message={alertMessage || ""} />

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        message={`선택한 ${selectedIds.length}개 유형을 삭제하시겠습니까?`}
        cancelText="취소"
        confirmText="삭제"
      />
    </AdminLayout>
  );
}

