"use client";

// ============================================
// 공지사항 관리 페이지 - 기획서 반영
// ============================================

import { useState, useCallback, useMemo } from "react";
import { AdminLayout } from "@/components/layout";
import { Button, DataTable, Pagination, AlertModal, ConfirmModal, DatePicker, Checkbox } from "@/components/common";
import { NoticeFormModal } from "./NoticeFormModal";
import { formatDate, cn } from "@/lib/utils";
import { RefreshCw, Plus, Trash2 } from "lucide-react";
import useSWR from "swr";
import { swrFetcher, apiClient } from "@/lib/api-client";
import type { SortConfig, TableColumn, NoticeListItem, NoticeSearchFilters } from "@/types";

const EXPOSURE_SCOPE_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "normal", label: "일반회원" },
  { value: "affiliate", label: "제휴사" },
  { value: "fs", label: "FS" },
];

const STATUS_OPTIONS = [
  { value: "before", label: "게시전" },
  { value: "active", label: "게시중" },
  { value: "ended", label: "종료" },
];

export default function NoticesPage() {
  const [filters, setFilters] = useState<NoticeSearchFilters>({
    title: "",
    status: [],
    visibility_scope: [],
    company_code: "",
    created_from: "",
    created_to: "",
  });

  const [sort, setSort] = useState<SortConfig>({ field: "created_at", direction: "desc" });
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<NoticeListItem | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hasSearched, setHasSearched] = useState(true);

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (filters.title) params.set("title", filters.title);
    if (filters.status && filters.status.length > 0) params.set("status", filters.status.join(","));
    if (filters.visibility_scope && filters.visibility_scope.length > 0)
      params.set("visibility_scope", filters.visibility_scope.join(","));
    if (filters.company_code) params.set("company_code", filters.company_code);
    if (filters.created_from) params.set("created_from", filters.created_from);
    if (filters.created_to) params.set("created_to", filters.created_to);
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
    data: NoticeListItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>(hasSearched ? `/admin/notices?${buildQueryString()}` : null, swrFetcher, { revalidateOnFocus: false });

  const notices = data?.data || [];
  const pagination = data?.pagination;

  const handleFilterChange = (key: keyof NoticeSearchFilters, value: string | string[]) => {
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
      status: [],
      visibility_scope: [],
      company_code: "",
      created_from: "",
      created_to: "",
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
    setSelectedIds(checked ? notices.map((n) => n.id) : []);
  };

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((v) => v !== id)));
  };

  const handleAdd = () => {
    setEditingNotice(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (notice: NoticeListItem) => {
    setEditingNotice(notice);
    setIsFormModalOpen(true);
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      await apiClient.delete("/admin/notices/batch-delete", { ids: selectedIds });

      setAlertMessage("공지사항이 삭제되었습니다.");
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
    setEditingNotice(null);
    mutate();
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "before": return "게시전";
      case "active": return "게시중";
      case "ended": return "종료";
      default: return status;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "before": return "bg-gray-100 text-gray-600";
      case "active": return "bg-green-100 text-green-700";
      case "ended": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const getScopeLabel = (scope: string[]) => {
    if (scope.includes("all")) return "전체";
    return scope
      .map((s) => {
        switch (s) {
          case "normal": return "일반";
          case "affiliate": return "제휴사";
          case "fs": return "FS";
          default: return s;
        }
      })
      .join(", ");
  };

  const columns: TableColumn<NoticeListItem>[] = useMemo(
    () => [
      {
        key: "checkbox",
        label: () => (
          <Checkbox
            checked={selectedIds.length === notices.length && notices.length > 0}
            onChange={(checked) => handleSelectAll(checked)}
          />
        ),
        sortable: false,
        align: "center",
        render: (_, row) => (
          <Checkbox
            checked={selectedIds.includes(row.id)}
            onChange={(checked) => handleSelect(row.id, checked)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      {
        key: "title",
        label: "공지 제목",
        sortable: true,
      },
      {
        key: "created_at",
        label: "등록일",
        sortable: true,
        render: (value) => formatDate(value as string),
      },
      {
        key: "period",
        label: "공지기간",
        sortable: false,
        render: (_, row) => {
          if (!row.start_date && !row.end_date) return "-";
          const start = row.start_date ? formatDate(row.start_date, "YYYY.MM.DD") : "";
          const end = row.end_date ? formatDate(row.end_date, "YYYY.MM.DD") : "";
          return `${start} ~ ${end}`;
        },
      },
      {
        key: "visibility_scope",
        label: "노출범위",
        sortable: false,
        render: (value) => getScopeLabel(value as string[]),
      },
      {
        key: "company_codes",
        label: "상세범위",
        sortable: false,
        render: (value) => {
          const codes = value as string[];
          if (!codes || codes.length === 0) return "-";
          return codes.join(", ");
        },
      },
      {
        key: "status",
        label: "공지상태",
        sortable: true,
        align: "center",
        render: (value) => (
          <span className={cn("px-2 py-1 rounded text-[12px] font-medium", getStatusBadgeClass(value as string))}>
            {getStatusLabel(value as string)}
          </span>
        ),
      },
    ],
    [selectedIds, notices]
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
            <h1 className="text-[18px] font-bold text-black">공지사항 관리</h1>
            <span className="text-[13px] text-[#888]">그리팅 케어 &gt; 공지사항 관리</span>
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
              <span className={labelClass}>공지 제목</span>
              <input
                type="text"
                value={filters.title}
                onChange={(e) => handleFilterChange("title", e.target.value)}
                className={cn(inputClass, "w-[180px]")}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>공지 상태</span>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.status?.length === STATUS_OPTIONS.length}
                    onChange={(e) => {
                      handleFilterChange("status", e.target.checked ? STATUS_OPTIONS.map((o) => o.value) : []);
                    }}
                    className={checkboxClass}
                  />
                  <span className="text-[13px] text-[#333]">전체</span>
                </label>
                {STATUS_OPTIONS.map((opt) => (
                  <label key={opt.value} className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.status?.includes(opt.value)}
                      onChange={(e) => {
                        const current = filters.status || [];
                        handleFilterChange(
                          "status",
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

            <div className="flex items-center gap-2">
              <span className={labelClass}>노출 범위</span>
              <div className="flex items-center gap-3">
                {EXPOSURE_SCOPE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.visibility_scope?.includes(opt.value)}
                      onChange={(e) => {
                        const current = filters.visibility_scope || [];
                        handleFilterChange(
                          "visibility_scope",
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

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-3">
            <div className="flex items-center gap-2">
              <span className={labelClass}>상세 범위</span>
              <input
                type="text"
                value={filters.company_code}
                onChange={(e) => handleFilterChange("company_code", e.target.value)}
                placeholder="기업/사업장 코드"
                className={cn(inputClass, "w-[150px]")}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>등록일</span>
              <DatePicker
                value={filters.created_from ? new Date(filters.created_from) : null}
                onChange={(date) =>
                  handleFilterChange("created_from", date ? date.toISOString().split("T")[0] : "")
                }
                placeholder="시작일"
              />
              <span className="text-gray-400">~</span>
              <DatePicker
                value={filters.created_to ? new Date(filters.created_to) : null}
                onChange={(date) => handleFilterChange("created_to", date ? date.toISOString().split("T")[0] : "")}
                placeholder="종료일"
              />
            </div>
          </div>
        </div>

        {/* 데이터 테이블 */}
        <DataTable
          columns={columns}
          data={hasSearched ? notices : []}
          totalCount={pagination?.total}
          sorting={sort}
          onSort={handleSort}
          onRowClick={handleEdit}
          isLoading={isLoading && hasSearched}
          emptyMessage={hasSearched ? "조회 결과가 없습니다." : "조회조건을 입력하고 조회 버튼을 클릭해주세요."}
          getRowKey={(row) => row.id}
          title="공지 리스트"
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

      <NoticeFormModal
        isOpen={isFormModalOpen}
        notice={editingNotice}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingNotice(null);
        }}
        onSuccess={handleSaveSuccess}
      />

      <AlertModal isOpen={!!alertMessage} onClose={() => setAlertMessage(null)} message={alertMessage || ""} />

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        message={`선택한 ${selectedIds.length}개의 공지사항을 삭제하시겠습니까?`}
        cancelText="취소"
        confirmText="삭제"
      />
    </AdminLayout>
  );
}
