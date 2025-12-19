"use client";

// ============================================
// 회원정보 관리 페이지 - 크기 조정
// ============================================

import { useState, useCallback } from "react";
import { AdminLayout } from "@/components/layout";
import { Button, DataTable, Pagination, AlertModal } from "@/components/common";
import { MemberDetailModal } from "./MemberDetailModal";
import { useMembers } from "@/hooks/useMembers";
import {
  maskEmail,
  maskName,
  maskBirthDate,
  maskPhone,
  formatDate,
  generateYearOptions,
  generateMonthOptions,
  generateDayOptions,
  getGenderLabel,
} from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import type {
  MemberSearchFilters,
  SortConfig,
  TableColumn,
  MemberListItem,
} from "@/types";

const MEMBER_TYPE_OPTIONS = [
  { value: "normal", label: "일반회원" },
  { value: "affiliate", label: "제휴사" },
  { value: "fs", label: "FS" },
];

const GENDER_OPTIONS = [
  { value: "", label: "전체" },
  { value: "male", label: "남성" },
  { value: "female", label: "여성" },
];

export default function MembersPage() {
  const [filters, setFilters] = useState<MemberSearchFilters>({
    name: "",
    id: "",
    birth_year: "",
    birth_month: "",
    birth_day: "",
    gender: "",
    member_types: [],
    phone: "",
    business_code: "",
    created_from: "",
    created_to: "",
  });

  const [sort, setSort] = useState<SortConfig>({
    field: "created_at",
    direction: "desc",
  });
  const [page, setPage] = useState(1);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const { members, pagination, isLoading, refetch } = useMembers(
    filters,
    sort,
    page,
    20,
    true
  );

  const handleFilterChange = (
    key: keyof MemberSearchFilters,
    value: string | string[]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setPage(1);
    refetch();
  };

  const handleRefresh = () => {
    setFilters({
      name: "",
      id: "",
      birth_year: "",
      birth_month: "",
      birth_day: "",
      gender: "",
      member_types: [],
      phone: "",
      business_code: "",
      created_from: "",
      created_to: "",
    });
    setSort({ field: "created_at", direction: "desc" });
    setPage(1);
  };

  const handleSort = useCallback((field: string) => {
    setSort((prev) => {
      if (prev.field !== field) {
        return { field, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { field, direction: "desc" };
      }
      return { field: null, direction: null };
    });
  }, []);

  const columns: TableColumn<MemberListItem>[] = [
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
      key: "birth_date",
      label: "생년월일",
      sortable: true,
      render: (value) => (value ? maskBirthDate(value as string) : "-"),
    },
    {
      key: "gender",
      label: "성별",
      sortable: true,
      render: (value) => getGenderLabel(value as string),
    },
    {
      key: "member_type",
      label: "회원구분",
      sortable: true,
    },
    {
      key: "business_code",
      label: "기업/사업자 코드",
      sortable: true,
      render: (value) => (value as string) || "-",
    },
    {
      key: "phone",
      label: "휴대폰 번호",
      sortable: true,
      render: (value) => (value ? maskPhone(value as string) : "-"),
    },
    {
      key: "created_at",
      label: "가입일",
      sortable: true,
      render: (value) => formatDate(value as string),
    },
  ];

  // 입력 스타일
  const inputClass =
    "h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] placeholder:text-gray-400";
  const selectClass =
    "h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white appearance-none focus:outline-none focus:border-[#666] select-arrow";
  const labelClass = "text-[13px] font-semibold text-[#333] whitespace-nowrap";
  const checkboxClass =
    "w-4 h-4 border border-gray-300 rounded cursor-pointer accent-[#737373]";

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[18px] font-bold text-black">회원정보 관리</h1>
            <span className="text-[13px] text-[#888]">
              시스템 관리 &gt; 그리팅 케어 &gt; 회원정보 관리
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
          {/* 1행 */}
          <div className="flex items-center gap-6 mb-3">
            <div className="flex items-center gap-2">
              <span className={labelClass}>고객명</span>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => handleFilterChange("name", e.target.value)}
                className={cn(inputClass, "w-[160px]")}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>생년월일</span>
              <select
                value={filters.birth_year}
                onChange={(e) =>
                  handleFilterChange("birth_year", e.target.value)
                }
                className={cn(selectClass, "w-[80px]")}
              >
                <option value="">년</option>
                {generateYearOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={filters.birth_month}
                onChange={(e) =>
                  handleFilterChange("birth_month", e.target.value)
                }
                className={cn(selectClass, "w-[60px]")}
              >
                <option value="">월</option>
                {generateMonthOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={filters.birth_day}
                onChange={(e) =>
                  handleFilterChange("birth_day", e.target.value)
                }
                className={cn(selectClass, "w-[60px]")}
              >
                <option value="">일</option>
                {generateDayOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>회원구분</span>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      filters.member_types?.length ===
                      MEMBER_TYPE_OPTIONS.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleFilterChange(
                          "member_types",
                          MEMBER_TYPE_OPTIONS.map((opt) => opt.value)
                        );
                      } else {
                        handleFilterChange("member_types", []);
                      }
                    }}
                    className={checkboxClass}
                  />
                  <span className="text-[13px] text-[#333]">전체</span>
                </label>
                {MEMBER_TYPE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="inline-flex items-center gap-1 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={
                        filters.member_types?.includes(option.value) || false
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleFilterChange("member_types", [
                            ...(filters.member_types || []),
                            option.value,
                          ]);
                        } else {
                          handleFilterChange(
                            "member_types",
                            (filters.member_types || []).filter(
                              (v) => v !== option.value
                            )
                          );
                        }
                      }}
                      className={checkboxClass}
                    />
                    <span className="text-[13px] text-[#333]">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>기업/사업장 코드</span>
              <input
                type="text"
                value={filters.business_code}
                onChange={(e) =>
                  handleFilterChange("business_code", e.target.value)
                }
                className={cn(inputClass, "w-[160px]")}
              />
            </div>
          </div>

          {/* 2행 */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className={labelClass}>ID</span>
              <input
                type="text"
                value={filters.id}
                onChange={(e) => handleFilterChange("id", e.target.value)}
                className={cn(inputClass, "w-[160px]")}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>성별</span>
              <select
                value={filters.gender}
                onChange={(e) => handleFilterChange("gender", e.target.value)}
                className={cn(selectClass, "w-[100px]")}
              >
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>휴대폰 번호</span>
              <input
                type="text"
                value={filters.phone}
                onChange={(e) => handleFilterChange("phone", e.target.value)}
                placeholder="010********"
                className={cn(inputClass, "w-[160px]")}
              />
            </div>
          </div>
        </div>

        {/* 데이터 테이블 */}
        <DataTable
          columns={columns}
          data={members}
          totalCount={pagination?.total}
          sorting={sort}
          onSort={handleSort}
          onRowClick={(row) => setSelectedMemberId(row.id)}
          isLoading={isLoading}
          emptyMessage="조회 결과가 없습니다."
          getRowKey={(row) => row.id}
          title="고객 리스트"
        />

        {pagination && pagination.totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        )}
      </div>

      <MemberDetailModal
        memberId={selectedMemberId}
        onClose={() => setSelectedMemberId(null)}
      />

      <AlertModal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        message={alertMessage || ""}
      />
    </AdminLayout>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
