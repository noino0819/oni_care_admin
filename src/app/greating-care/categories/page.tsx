"use client";

// ============================================
// 컨텐츠 카테고리 관리 페이지 - 기획서 반영
// ============================================

import { useState, useCallback, useMemo } from "react";
import { AdminLayout } from "@/components/layout";
import { Button, DataTable, AlertModal, ConfirmModal, Checkbox } from "@/components/common";
import { CategoryFormModal } from "./CategoryFormModal";
import { SubcategoryFormModal } from "./SubcategoryFormModal";
import { cn } from "@/lib/utils";
import { RefreshCw, Plus, Trash2, Edit } from "lucide-react";
import useSWR from "swr";
import type { SortConfig, TableColumn, ContentCategory, ContentSubcategory, CategorySearchFilters } from "@/types";

const fetcher = async (url: string) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
  const response = await fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
  if (!response.ok) throw new Error("API 요청 실패");
  return response.json();
};

export default function CategoriesPage() {
  const [filters, setFilters] = useState<CategorySearchFilters>({
    category_name: "",
    subcategory_name: "",
    is_active: "",
  });

  const [mainSort, setMainSort] = useState<SortConfig>({ field: "display_order", direction: "asc" });
  const [subSort, setSubSort] = useState<SortConfig>({ field: "display_order", direction: "asc" });
  const [selectedMainIds, setSelectedMainIds] = useState<number[]>([]);
  const [selectedSubIds, setSelectedSubIds] = useState<number[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ContentCategory | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<ContentSubcategory | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmDeleteMain, setConfirmDeleteMain] = useState(false);
  const [confirmDeleteSub, setConfirmDeleteSub] = useState(false);

  const buildMainQuery = () => {
    const params = new URLSearchParams();
    if (filters.category_name) params.set("category_name", filters.category_name);
    if (filters.is_active) params.set("is_active", filters.is_active);
    return params.toString();
  };

  const buildSubQuery = () => {
    const params = new URLSearchParams();
    if (filters.subcategory_name) params.set("subcategory_name", filters.subcategory_name);
    if (filters.is_active) params.set("is_active", filters.is_active);
    return params.toString();
  };

  const { data: categoriesData, mutate: mutateCategories } = useSWR<{
    success: boolean;
    data: ContentCategory[];
  }>(`/api/admin/categories?${buildMainQuery()}`, fetcher, { revalidateOnFocus: false });

  const { data: subcategoriesData, mutate: mutateSubcategories } = useSWR<{
    success: boolean;
    data: ContentSubcategory[];
  }>(`/api/admin/subcategories?${buildSubQuery()}`, fetcher, { revalidateOnFocus: false });

  const categories = categoriesData?.data || [];
  const subcategories = subcategoriesData?.data || [];

  const handleFilterChange = (key: keyof CategorySearchFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    mutateCategories();
    mutateSubcategories();
  };

  const handleRefresh = () => {
    setFilters({ category_name: "", subcategory_name: "", is_active: "" });
    setSelectedMainIds([]);
    setSelectedSubIds([]);
    mutateCategories();
    mutateSubcategories();
  };

  const handleMainSort = useCallback((field: string) => {
    setMainSort((prev) => {
      if (prev.field !== field) return { field, direction: "asc" };
      if (prev.direction === "asc") return { field, direction: "desc" };
      return { field: null, direction: null };
    });
  }, []);

  const handleSubSort = useCallback((field: string) => {
    setSubSort((prev) => {
      if (prev.field !== field) return { field, direction: "asc" };
      if (prev.direction === "asc") return { field, direction: "desc" };
      return { field: null, direction: null };
    });
  }, []);

  // 대분류 선택
  const handleSelectAllMain = (checked: boolean) => {
    setSelectedMainIds(checked ? categories.map((c) => c.id) : []);
  };

  const handleSelectMain = (id: number, checked: boolean) => {
    setSelectedMainIds((prev) => (checked ? [...prev, id] : prev.filter((v) => v !== id)));
  };

  // 중분류 선택
  const handleSelectAllSub = (checked: boolean) => {
    setSelectedSubIds(checked ? subcategories.map((s) => s.id) : []);
  };

  const handleSelectSub = (id: number, checked: boolean) => {
    setSelectedSubIds((prev) => (checked ? [...prev, id] : prev.filter((v) => v !== id)));
  };

  // 대분류 삭제
  const handleDeleteMain = async () => {
    if (selectedMainIds.length === 0) return;

    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch("/api/admin/categories/bulk-delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ ids: selectedMainIds }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "삭제에 실패했습니다.");
      }

      setAlertMessage("대분류가 삭제되었습니다.");
      setSelectedMainIds([]);
      mutateCategories();
      mutateSubcategories();
    } catch (error) {
      setAlertMessage(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    } finally {
      setConfirmDeleteMain(false);
    }
  };

  // 중분류 삭제
  const handleDeleteSub = async () => {
    if (selectedSubIds.length === 0) return;

    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch("/api/admin/subcategories/bulk-delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ ids: selectedSubIds }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "삭제에 실패했습니다.");
      }

      setAlertMessage("중분류가 삭제되었습니다.");
      setSelectedSubIds([]);
      mutateSubcategories();
    } catch (error) {
      setAlertMessage(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    } finally {
      setConfirmDeleteSub(false);
    }
  };

  // 대분류 컬럼
  const mainColumns: TableColumn<ContentCategory>[] = useMemo(
    () => [
      {
        key: "checkbox",
        label: () => (
          <Checkbox
            checked={selectedMainIds.length === categories.length && categories.length > 0}
            onChange={(e) => handleSelectAllMain(e.target.checked)}
          />
        ),
        sortable: false,
        align: "center",
        render: (_, row) => (
          <Checkbox
            checked={selectedMainIds.includes(row.id)}
            onChange={(e) => handleSelectMain(row.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      {
        key: "category_name",
        label: "대분류명",
        sortable: true,
      },
      {
        key: "display_order",
        label: "정렬순서",
        sortable: true,
        align: "center",
      },
      {
        key: "is_active",
        label: "사용여부",
        sortable: false,
        align: "center",
        render: (value) => (
          <span className={cn("px-2 py-1 rounded text-[12px] font-medium", value ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>
            {value ? "Y" : "N"}
          </span>
        ),
      },
      {
        key: "subcategory_types",
        label: "세분류 종류",
        sortable: false,
        render: (value) => (value as string) || "-",
      },
      {
        key: "id",
        label: "관리",
        sortable: false,
        align: "center",
        render: (_, row) => (
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              setEditingCategory(row);
              setIsCategoryModalOpen(true);
            }}
            className="px-2 py-1 text-[11px]"
          >
            <Edit className="w-3 h-3" />
          </Button>
        ),
      },
    ],
    [selectedMainIds, categories]
  );

  // 중분류 컬럼
  const subColumns: TableColumn<ContentSubcategory>[] = useMemo(
    () => [
      {
        key: "checkbox",
        label: () => (
          <Checkbox
            checked={selectedSubIds.length === subcategories.length && subcategories.length > 0}
            onChange={(e) => handleSelectAllSub(e.target.checked)}
          />
        ),
        sortable: false,
        align: "center",
        render: (_, row) => (
          <Checkbox
            checked={selectedSubIds.includes(row.id)}
            onChange={(e) => handleSelectSub(row.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      {
        key: "category_name",
        label: "대분류명",
        sortable: true,
      },
      {
        key: "subcategory_name",
        label: "중분류명",
        sortable: true,
      },
      {
        key: "display_order",
        label: "정렬순서",
        sortable: true,
        align: "center",
      },
      {
        key: "is_active",
        label: "사용여부",
        sortable: false,
        align: "center",
        render: (value) => (
          <span className={cn("px-2 py-1 rounded text-[12px] font-medium", value ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>
            {value ? "Y" : "N"}
          </span>
        ),
      },
      {
        key: "id",
        label: "관리",
        sortable: false,
        align: "center",
        render: (_, row) => (
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              setEditingSubcategory(row);
              setIsSubcategoryModalOpen(true);
            }}
            className="px-2 py-1 text-[11px]"
          >
            <Edit className="w-3 h-3" />
          </Button>
        ),
      },
    ],
    [selectedSubIds, subcategories]
  );

  const inputClass =
    "h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white focus:outline-none focus:border-[#666] placeholder:text-gray-400";
  const selectClass =
    "h-[30px] px-2 border border-gray-300 rounded text-[13px] bg-white appearance-none focus:outline-none focus:border-[#666] select-arrow";
  const labelClass = "text-[13px] font-semibold text-[#333] whitespace-nowrap";

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[18px] font-bold text-black">컨텐츠 카테고리 관리</h1>
            <span className="text-[13px] text-[#888]">
              시스템 관리 &gt; 그리팅 케어 &gt; 컨텐츠 카테고리 관리
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
              <span className={labelClass}>대분류명</span>
              <input
                type="text"
                value={filters.category_name}
                onChange={(e) => handleFilterChange("category_name", e.target.value)}
                className={cn(inputClass, "w-[150px]")}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>중분류명</span>
              <input
                type="text"
                value={filters.subcategory_name}
                onChange={(e) => handleFilterChange("subcategory_name", e.target.value)}
                className={cn(inputClass, "w-[150px]")}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className={labelClass}>사용여부</span>
              <select
                value={filters.is_active}
                onChange={(e) => handleFilterChange("is_active", e.target.value)}
                className={cn(selectClass, "w-[100px]")}
              >
                <option value="">전체</option>
                <option value="true">Y</option>
                <option value="false">N</option>
              </select>
            </div>
          </div>
        </div>

        {/* 데이터 테이블 영역 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 대분류 리스트 */}
          <div>
            <DataTable
              columns={mainColumns}
              data={categories}
              totalCount={categories.length}
              sorting={mainSort}
              onSort={handleMainSort}
              isLoading={false}
              emptyMessage="대분류가 없습니다."
              getRowKey={(row) => String(row.id)}
              title="대분류 리스트"
              headerAction={
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (selectedMainIds.length === 0) {
                        setAlertMessage("삭제할 항목을 선택해주세요.");
                        return;
                      }
                      setConfirmDeleteMain(true);
                    }}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    삭제
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingCategory(null);
                      setIsCategoryModalOpen(true);
                    }}
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    추가
                  </Button>
                </div>
              }
            />
          </div>

          {/* 중분류 리스트 */}
          <div>
            <DataTable
              columns={subColumns}
              data={subcategories}
              totalCount={subcategories.length}
              sorting={subSort}
              onSort={handleSubSort}
              isLoading={false}
              emptyMessage="중분류가 없습니다."
              getRowKey={(row) => String(row.id)}
              title="중분류 리스트"
              headerAction={
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (selectedSubIds.length === 0) {
                        setAlertMessage("삭제할 항목을 선택해주세요.");
                        return;
                      }
                      setConfirmDeleteSub(true);
                    }}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    삭제
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingSubcategory(null);
                      setIsSubcategoryModalOpen(true);
                    }}
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    추가
                  </Button>
                </div>
              }
            />
          </div>
        </div>
      </div>

      {/* 대분류 등록/수정 모달 */}
      <CategoryFormModal
        isOpen={isCategoryModalOpen}
        category={editingCategory}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        onSuccess={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
          mutateCategories();
        }}
      />

      {/* 중분류 등록/수정 모달 */}
      <SubcategoryFormModal
        isOpen={isSubcategoryModalOpen}
        subcategory={editingSubcategory}
        categories={categories}
        onClose={() => {
          setIsSubcategoryModalOpen(false);
          setEditingSubcategory(null);
        }}
        onSuccess={() => {
          setIsSubcategoryModalOpen(false);
          setEditingSubcategory(null);
          mutateSubcategories();
        }}
      />

      <AlertModal isOpen={!!alertMessage} onClose={() => setAlertMessage(null)} message={alertMessage || ""} />

      <ConfirmModal
        isOpen={confirmDeleteMain}
        onClose={() => setConfirmDeleteMain(false)}
        onConfirm={handleDeleteMain}
        message={`선택한 ${selectedMainIds.length}개의 대분류를 삭제하시겠습니까?\n연결된 중분류도 함께 삭제됩니다.`}
        cancelText="취소"
        confirmText="삭제"
      />

      <ConfirmModal
        isOpen={confirmDeleteSub}
        onClose={() => setConfirmDeleteSub(false)}
        onConfirm={handleDeleteSub}
        message={`선택한 ${selectedSubIds.length}개의 중분류를 삭제하시겠습니까?`}
        cancelText="취소"
        confirmText="삭제"
      />
    </AdminLayout>
  );
}


