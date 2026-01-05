"use client";

// ============================================
// 포인트 관리 페이지 - 기획서 반영
// ============================================

import { useState, useCallback } from "react";
import { AdminLayout } from "@/components/layout";
import { Button, DataTable, AlertModal, ConfirmModal, DatePicker } from "@/components/common";
import { maskEmail, maskName, formatDate, cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import useSWR from "swr";
import { swrFetcher, apiClient } from "@/lib/api-client";
import type { SortConfig, TableColumn } from "@/types";

interface PointSummary {
  user_id: string;
  email: string;
  name: string;
  member_type: string;
  business_code: string | null;
  total_points: number;
}

interface PointHistoryItem {
  id: string;
  user_id: string;
  email: string;
  transaction_type: "earn" | "use" | "transfer" | "expire";
  source: string;
  source_detail: string | null;
  points: number;
  balance_after: number;
  created_at: string;
  is_revoked: boolean;
}

interface PointSearchFilters {
  name: string;
  id: string;
  member_types: string[];
  business_code: string;
  min_points: string;
  max_points: string;
  transaction_type: string;
  created_from: string;
  created_to: string;
}

const MEMBER_TYPE_OPTIONS = [
  { value: "normal", label: "일반회원" },
  { value: "affiliate", label: "제휴사" },
  { value: "fs", label: "FS" },
];

const TRANSACTION_TYPE_OPTIONS = [
  { value: "", label: "전체" },
  { value: "earn", label: "적립" },
  { value: "use", label: "사용" },
  { value: "expire", label: "소멸" },
];

export default function PointsPage() {
  const [filters, setFilters] = useState<PointSearchFilters>({
    name: "",
    id: "",
    member_types: [],
    business_code: "",
    min_points: "",
    max_points: "",
    transaction_type: "",
    created_from: "",
    created_to: "",
  });

  const [summarySort, setSummarySort] = useState<SortConfig>({ field: null, direction: null });
  const [historySort, setHistorySort] = useState<SortConfig>({ field: null, direction: null });
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmData, setConfirmData] = useState<{
    isOpen: boolean;
    historyId: string;
    userName: string;
    points: number;
  } | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // 포인트 현황 조회
  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (filters.name) params.set("name", filters.name);
    if (filters.id) params.set("id", filters.id);
    if (filters.member_types.length > 0) params.set("member_types", filters.member_types.join(","));
    if (filters.business_code) params.set("business_code", filters.business_code);
    if (filters.min_points) params.set("min_points", filters.min_points);
    if (filters.max_points) params.set("max_points", filters.max_points);
    if (filters.transaction_type) params.set("transaction_type", filters.transaction_type);
    if (filters.created_from) params.set("created_from", filters.created_from);
    if (filters.created_to) params.set("created_to", filters.created_to);
    return params.toString();
  };

  const { data: summaryData, mutate: mutateSummary } = useSWR<{ success: boolean; data: PointSummary[] }>(
    hasSearched ? `/api/admin/points?${buildQueryString()}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: historyData, mutate: mutateHistory } = useSWR<{ success: boolean; data: PointHistoryItem[] }>(
    selectedUserId ? `/api/admin/points/${selectedUserId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const handleFilterChange = (key: keyof PointSearchFilters, value: string | string[]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setHasSearched(true);
    setSelectedUserId(null);
    mutateSummary();
  };

  const handleRefresh = () => {
    setFilters({
      name: "",
      id: "",
      member_types: [],
      business_code: "",
      min_points: "",
      max_points: "",
      transaction_type: "",
      created_from: "",
      created_to: "",
    });
    setHasSearched(false);
    setSelectedUserId(null);
  };

  const handleSummarySort = useCallback((field: string) => {
    setSummarySort((prev) => {
      if (prev.field !== field) return { field, direction: "asc" };
      if (prev.direction === "asc") return { field, direction: "desc" };
      return { field: null, direction: null };
    });
  }, []);

  const handleHistorySort = useCallback((field: string) => {
    setHistorySort((prev) => {
      if (prev.field !== field) return { field, direction: "asc" };
      if (prev.direction === "asc") return { field, direction: "desc" };
      return { field: null, direction: null };
    });
  }, []);

  const handleRevoke = async () => {
    if (!confirmData) return;

    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(`/api/admin/points/${confirmData.historyId}/revoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "회수에 실패했습니다.");
      }

      setAlertMessage("포인트가 회수되었습니다.");
      mutateHistory();
      mutateSummary();
    } catch (error) {
      setAlertMessage(error instanceof Error ? error.message : "회수에 실패했습니다.");
    } finally {
      setConfirmData(null);
    }
  };

  const getMemberTypeLabel = (type: string) => {
    switch (type) {
      case "normal": return "일반";
      case "fs": return "FS";
      case "affiliate": return "제휴사";
      default: return type;
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case "earn": return "적립";
      case "use": return "사용";
      case "transfer": return "전환";
      case "expire": return "소멸";
      default: return type;
    }
  };

  // 회원별 포인트 현황 컬럼
  const summaryColumns: TableColumn<PointSummary>[] = [
    {
      key: "email",
      label: "ID",
      sortable: true,
      render: (value) => maskEmail(value as string),
    },
    {
      key: "name",
      label: "고객명",
      sortable: true,
      render: (value) => maskName(value as string),
    },
    {
      key: "member_type",
      label: "회원구분",
      sortable: false,
      render: (value) => getMemberTypeLabel(value as string),
    },
    {
      key: "business_code",
      label: "기업/사업자 코드",
      sortable: false,
      render: (value) => (value as string) || "-",
    },
    {
      key: "total_points",
      label: "누적 포인트",
      sortable: true,
      render: (value) => `${(value as number).toLocaleString()}P`,
    },
  ];

  // 세부현황 컬럼
  const historyColumns: TableColumn<PointHistoryItem>[] = [
    {
      key: "email",
      label: "ID",
      sortable: true,
      render: (value) => maskEmail(value as string),
    },
    {
      key: "transaction_type",
      label: "구분",
      sortable: true,
      render: (value) => getTransactionTypeLabel(value as string),
    },
    {
      key: "source_detail",
      label: "세부내용",
      sortable: false,
      render: (value, row) => (value as string) || row.source || "-",
    },
    {
      key: "points",
      label: "액수",
      sortable: true,
      render: (value) => `${Math.abs(value as number).toLocaleString()}P`,
    },
    {
      key: "created_at",
      label: "적립일시",
      sortable: true,
      render: (value) => formatDate(value as string, "YYYY.MM.DD HH:mm:ss"),
    },
    {
      key: "id",
      label: "회수",
      sortable: false,
      align: "center",
      render: (_, row) => {
        if (row.transaction_type !== "earn" || row.is_revoked) return null;
        return (
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              const user = summaryData?.data.find((u) => u.user_id === row.user_id);
              setConfirmData({
                isOpen: true,
                historyId: row.id,
                userName: user?.name || "",
                points: row.points,
              });
            }}
            className="px-2 py-1 text-[11px]"
          >
            회수
          </Button>
        );
      },
    },
  ];

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
            <h1 className="text-[18px] font-bold text-black">포인트 관리</h1>
            <span className="text-[13px] text-[#888]">
              그리팅 케어 &gt; 회원자산 관리 &gt; 포인트 관리
            </span>
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
              <span className={labelClass}>고객명</span>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => handleFilterChange("name", e.target.value)}
                className={cn(inputClass, "w-[120px]")}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>회원구분</span>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.member_types.length === MEMBER_TYPE_OPTIONS.length}
                    onChange={(e) => {
                      handleFilterChange(
                        "member_types",
                        e.target.checked ? MEMBER_TYPE_OPTIONS.map((o) => o.value) : []
                      );
                    }}
                    className={checkboxClass}
                  />
                  <span className="text-[13px] text-[#333]">전체</span>
                </label>
                {MEMBER_TYPE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.member_types.includes(opt.value)}
                      onChange={(e) => {
                        handleFilterChange(
                          "member_types",
                          e.target.checked
                            ? [...filters.member_types, opt.value]
                            : filters.member_types.filter((v) => v !== opt.value)
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
              <span className={labelClass}>포인트 금액</span>
              <input
                type="number"
                value={filters.min_points}
                onChange={(e) => handleFilterChange("min_points", e.target.value)}
                placeholder="최소"
                className={cn(inputClass, "w-[80px]")}
              />
              <span className="text-gray-400">~</span>
              <input
                type="number"
                value={filters.max_points}
                onChange={(e) => handleFilterChange("max_points", e.target.value)}
                placeholder="최대"
                className={cn(inputClass, "w-[80px]")}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>포인트 구분</span>
              <select
                value={filters.transaction_type}
                onChange={(e) => handleFilterChange("transaction_type", e.target.value)}
                className={cn(selectClass, "w-[100px]")}
              >
                {TRANSACTION_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-3">
            <div className="flex items-center gap-2">
              <span className={labelClass}>ID</span>
              <input
                type="text"
                value={filters.id}
                onChange={(e) => handleFilterChange("id", e.target.value)}
                className={cn(inputClass, "w-[120px]")}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>기업/사업장 코드</span>
              <input
                type="text"
                value={filters.business_code}
                onChange={(e) => handleFilterChange("business_code", e.target.value)}
                className={cn(inputClass, "w-[120px]")}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>적립 일시</span>
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
                onChange={(date) =>
                  handleFilterChange("created_to", date ? date.toISOString().split("T")[0] : "")
                }
                placeholder="종료일"
              />
            </div>
          </div>
        </div>

        {/* 데이터 테이블 영역 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 회원별 포인트 현황 */}
          <div>
            <DataTable
              columns={summaryColumns}
              data={hasSearched ? (summaryData?.data || []) : []}
              totalCount={summaryData?.data?.length}
              sorting={summarySort}
              onSort={handleSummarySort}
              onRowClick={(row) => setSelectedUserId(row.user_id)}
              isLoading={false}
              emptyMessage={hasSearched ? "조회 결과가 없습니다." : "조회조건을 입력하고 조회 버튼을 클릭해주세요."}
              getRowKey={(row) => row.user_id}
              title="회원별 포인트 현황"
            />
          </div>

          {/* 세부현황 */}
          <div>
            <DataTable
              columns={historyColumns}
              data={selectedUserId ? (historyData?.data || []) : []}
              totalCount={historyData?.data?.length}
              sorting={historySort}
              onSort={handleHistorySort}
              isLoading={false}
              emptyMessage={selectedUserId ? "포인트 내역이 없습니다." : "회원을 선택해주세요."}
              getRowKey={(row) => row.id}
              title="세부현황"
            />
          </div>
        </div>
      </div>

      <AlertModal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        message={alertMessage || ""}
      />

      <ConfirmModal
        isOpen={confirmData?.isOpen || false}
        onClose={() => setConfirmData(null)}
        onConfirm={handleRevoke}
        message={`${confirmData?.userName || ""}님의 포인트(${confirmData?.points?.toLocaleString() || 0}P)를 회수하시겠습니까?`}
        cancelText="취소"
        confirmText="회수하기"
      />
    </AdminLayout>
  );
}
