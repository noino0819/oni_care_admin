"use client";

// ============================================
// PUSH 관리 페이지 - 기획서 반영
// ============================================

import { useState, useCallback, useMemo } from "react";
import { AdminLayout } from "@/components/layout";
import { Button, DataTable, Pagination, AlertModal, ConfirmModal, Checkbox } from "@/components/common";
import { PushFormModal } from "./PushFormModal";
import { formatDate, cn } from "@/lib/utils";
import { RefreshCw, Plus, Trash2 } from "lucide-react";
import useSWR from "swr";
import { swrFetcher, apiClient } from "@/lib/api-client";
import type { SortConfig, TableColumn, PushNotificationListItem, PushNotificationSearchFilters } from "@/types";

// 전송대상 옵션
const TARGET_AUDIENCE_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "fs", label: "FS" },
  { value: "affiliate", label: "제휴사" },
  { value: "normal", label: "일반" },
];

// 발송유형 옵션
const SEND_TYPE_OPTIONS = [
  { value: "system_time", label: "시스템 시간" },
  { value: "time_select", label: "시간 선택" },
  { value: "condition_met", label: "조건 달성시" },
];

export default function PushNotificationsPage() {
  const [filters, setFilters] = useState<PushNotificationSearchFilters>({
    push_name: "",
    target_audience: [],
    send_to_store: [],
    is_active: [],
    send_type: [],
    send_type_detail: "",
  });

  const [sort, setSort] = useState<SortConfig>({ field: "created_at", direction: "desc" });
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPush, setEditingPush] = useState<PushNotificationListItem | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hasSearched, setHasSearched] = useState(true);

  // 세부유형 옵션 (발송유형에 따라 변경)
  const { data: sendTypeDetails } = useSWR<{ success: boolean; data: { value: string; label: string }[] }>(
    filters.send_type && filters.send_type.length === 1
      ? `/admin/push-notifications/send-type-details?send_type=${filters.send_type[0]}`
      : null,
    swrFetcher
  );

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (filters.push_name) params.set("push_name", filters.push_name);
    if (filters.target_audience && filters.target_audience.length > 0)
      params.set("target_audience", filters.target_audience.join(","));
    if (filters.send_to_store && filters.send_to_store.length > 0)
      params.set("send_to_store", filters.send_to_store.join(","));
    if (filters.is_active && filters.is_active.length > 0)
      params.set("is_active", filters.is_active.join(","));
    if (filters.send_type && filters.send_type.length > 0)
      params.set("send_type", filters.send_type.join(","));
    if (filters.send_type_detail) params.set("send_type_detail", filters.send_type_detail);
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
    data: PushNotificationListItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>(hasSearched ? `/admin/push-notifications?${buildQueryString()}` : null, swrFetcher, { revalidateOnFocus: false });

  const pushList = data?.data || [];
  const pagination = data?.pagination;

  const handleFilterChange = (key: keyof PushNotificationSearchFilters, value: string | string[]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setPage(1);
    setHasSearched(true);
    mutate();
  };

  const handleRefresh = () => {
    setFilters({
      push_name: "",
      target_audience: [],
      send_to_store: [],
      is_active: [],
      send_type: [],
      send_type_detail: "",
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
    setSelectedIds(checked ? pushList.map((p) => p.id) : []);
  };

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((v) => v !== id)));
  };

  const handleAdd = () => {
    setEditingPush(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (push: PushNotificationListItem) => {
    setEditingPush(push);
    setIsFormModalOpen(true);
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      await apiClient.post("/admin/push-notifications/batch-delete", { ids: selectedIds });

      setAlertMessage("푸시 알림이 삭제되었습니다.");
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
    setEditingPush(null);
    mutate();
  };

  const getTargetLabel = (target: string[]) => {
    if (target.includes("all")) return "전체";
    return target
      .map((t) => {
        const opt = TARGET_AUDIENCE_OPTIONS.find((o) => o.value === t);
        return opt?.label || t;
      })
      .join(", ");
  };

  const getSendTypeLabel = (type: string) => {
    const opt = SEND_TYPE_OPTIONS.find((o) => o.value === type);
    return opt?.label || type;
  };

  const columns: TableColumn<PushNotificationListItem>[] = useMemo(
    () => [
      {
        key: "checkbox",
        label: () => (
          <Checkbox
            checked={selectedIds.length === pushList.length && pushList.length > 0}
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
        key: "push_name",
        label: "푸시명",
        sortable: true,
      },
      {
        key: "target_audience",
        label: "전송대상",
        sortable: false,
        render: (value) => getTargetLabel(value as string[]),
      },
      {
        key: "content",
        label: "내용",
        sortable: false,
        render: (value) => {
          const content = value as string | null;
          if (!content) return "-";
          return content.length > 30 ? content.substring(0, 30) + "..." : content;
        },
      },
      {
        key: "send_type",
        label: "발송유형",
        sortable: true,
        render: (value) => getSendTypeLabel(value as string),
      },
      {
        key: "send_type_detail",
        label: "세부유형",
        sortable: false,
        render: (value, row) => {
          const detail = value as string | null;
          if (row.send_type === "system_time" && row.send_time) {
            return row.send_time;
          }
          return detail || "-";
        },
      },
      {
        key: "link_url",
        label: "연결 링크",
        sortable: false,
        render: (value) => {
          const url = value as string | null;
          if (!url) return "N";
          return (
            <span className="text-blue-600 underline cursor-pointer" title={url}>
              ({url.length > 15 ? url.substring(0, 15) + "..." : url})
            </span>
          );
        },
      },
    ],
    [selectedIds, pushList]
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
            <h1 className="text-[18px] font-bold text-black">PUSH 관리</h1>
            <span className="text-[13px] text-[#888]">그리팅 케어 &gt; 기타 &gt; PUSH 관리</span>
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
              <span className={labelClass}>푸시명</span>
              <input
                type="text"
                value={filters.push_name}
                onChange={(e) => handleFilterChange("push_name", e.target.value)}
                className={cn(inputClass, "w-[180px]")}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>전송대상</span>
              <div className="flex items-center gap-3">
                {TARGET_AUDIENCE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.target_audience?.includes(opt.value)}
                      onChange={(e) => {
                        const current = filters.target_audience || [];
                        handleFilterChange(
                          "target_audience",
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
              <span className={labelClass}>스토어 전송여부</span>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.send_to_store?.includes("Y")}
                    onChange={(e) => {
                      const current = filters.send_to_store || [];
                      handleFilterChange(
                        "send_to_store",
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
                    checked={filters.send_to_store?.includes("N")}
                    onChange={(e) => {
                      const current = filters.send_to_store || [];
                      handleFilterChange(
                        "send_to_store",
                        e.target.checked ? [...current, "N"] : current.filter((v) => v !== "N")
                      );
                    }}
                    className={checkboxClass}
                  />
                  <span className="text-[13px] text-[#333]">N</span>
                </label>
              </div>
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

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-3">
            <div className="flex items-center gap-2">
              <span className={labelClass}>발송유형</span>
              <div className="flex items-center gap-3">
                {SEND_TYPE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.send_type?.includes(opt.value)}
                      onChange={(e) => {
                        const current = filters.send_type || [];
                        handleFilterChange(
                          "send_type",
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
              <span className={labelClass}>세부유형</span>
              <select
                value={filters.send_type_detail || ""}
                onChange={(e) => handleFilterChange("send_type_detail", e.target.value)}
                className={cn(selectClass, "w-[200px]")}
              >
                <option value="">전체</option>
                {sendTypeDetails?.data?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 데이터 테이블 */}
        <DataTable
          columns={columns}
          data={hasSearched ? pushList : []}
          totalCount={pagination?.total}
          sorting={sort}
          onSort={handleSort}
          onRowClick={handleEdit}
          isLoading={isLoading && hasSearched}
          emptyMessage={hasSearched ? "조회 결과가 없습니다." : "조회조건을 입력하고 조회 버튼을 클릭해주세요."}
          getRowKey={(row) => row.id}
          title="푸시 리스트"
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

      <PushFormModal
        isOpen={isFormModalOpen}
        push={editingPush}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingPush(null);
        }}
        onSuccess={handleSaveSuccess}
      />

      <AlertModal isOpen={!!alertMessage} onClose={() => setAlertMessage(null)} message={alertMessage || ""} />

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        message={`선택한 ${selectedIds.length}개 푸시를 삭제하시겠습니까?`}
        cancelText="취소"
        confirmText="삭제"
      />
    </AdminLayout>
  );
}

