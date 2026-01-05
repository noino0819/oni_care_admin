// ============================================
// 컨텐츠 카테고리 관리 훅 - SWR 기반 데이터 페칭
// ============================================
// FastAPI 백엔드 연동

import useSWR, { mutate as globalMutate } from 'swr';
import { swrFetcher, apiClient } from '@/lib/api-client';
import type {
  ContentCategory,
  ContentSubcategory,
  CategoryForm,
  SubcategoryForm,
  CategorySearchFilters,
  SortConfig,
  ApiResponse,
  PaginationInfo,
} from '@/types';

// 검색 필터를 쿼리스트링으로 변환
function filtersToQuery(
  filters: CategorySearchFilters,
  sort: SortConfig,
  page: number,
  pageSize: number
): string {
  const params = new URLSearchParams();
  
  if (filters.category_name) params.append('category_name', filters.category_name);
  if (filters.subcategory_name) params.append('subcategory_name', filters.subcategory_name);
  if (filters.is_active) params.append('is_active', filters.is_active);
  
  if (sort.field) {
    params.append('sort_field', sort.field);
    params.append('sort_direction', sort.direction || 'asc');
  }
  
  params.append('page', String(page));
  params.append('page_size', String(pageSize));
  
  return params.toString();
}

interface CategoriesWithSubcategoriesResponse {
  success: boolean;
  data: {
    categories: ContentCategory[];
    subcategories: ContentSubcategory[];
  };
  pagination: PaginationInfo;
}

interface CategoriesListResponse {
  success: boolean;
  data: ContentCategory[];
}

interface CategoryDetailResponse {
  success: boolean;
  data: ContentCategory;
}

interface SubcategoryDetailResponse {
  success: boolean;
  data: ContentSubcategory;
}

// 카테고리와 중분류 함께 조회 훅
export function useCategoriesWithSubcategories(
  filters: CategorySearchFilters,
  sort: SortConfig,
  page: number,
  pageSize: number = 20
) {
  const queryString = filtersToQuery(filters, sort, page, pageSize);
  const { data, error, isLoading, mutate } = useSWR<CategoriesWithSubcategoriesResponse>(
    `/admin/content-categories?${queryString}`,
    swrFetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    categories: data?.data?.categories || [],
    subcategories: data?.data?.subcategories || [],
    pagination: data?.pagination || null,
    isLoading,
    error,
    refetch: mutate,
  };
}

// 대분류 목록만 조회 훅
export function useCategoriesList() {
  const { data, error, isLoading, mutate } = useSWR<CategoriesListResponse>(
    '/admin/content-categories/list',
    swrFetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    categories: data?.data || [],
    isLoading,
    error,
    refetch: mutate,
  };
}

// 대분류 상세 조회 훅
export function useCategoryDetail(id: number | null) {
  const { data, error, isLoading, mutate } = useSWR<CategoryDetailResponse>(
    id ? `/admin/content-categories/${id}` : null,
    swrFetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    category: data?.data || null,
    isLoading,
    error,
    refetch: mutate,
  };
}

// 중분류 상세 조회 훅
export function useSubcategoryDetail(id: number | null) {
  const { data, error, isLoading, mutate } = useSWR<SubcategoryDetailResponse>(
    id ? `/admin/content-subcategories/${id}` : null,
    swrFetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    subcategory: data?.data || null,
    isLoading,
    error,
    refetch: mutate,
  };
}

// 대분류 등록 함수
export async function createCategory(form: CategoryForm): Promise<ApiResponse<ContentCategory>> {
  const result = await apiClient.post<ContentCategory>('/admin/content-categories', form);
  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/admin/content-categories'), undefined, { revalidate: true });
  return result;
}

// 대분류 수정 함수
export async function updateCategory(id: number, form: CategoryForm): Promise<ApiResponse<ContentCategory>> {
  const result = await apiClient.put<ContentCategory>(`/admin/content-categories/${id}`, form);
  globalMutate(`/admin/content-categories/${id}`);
  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/admin/content-categories'), undefined, { revalidate: true });
  return result;
}

// 대분류 삭제 함수
export async function deleteCategory(id: number): Promise<void> {
  await apiClient.delete(`/admin/content-categories/${id}`);
  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/admin/content-categories'), undefined, { revalidate: true });
}

// 중분류 등록 함수
export async function createSubcategory(form: SubcategoryForm): Promise<ApiResponse<ContentSubcategory>> {
  const result = await apiClient.post<ContentSubcategory>('/admin/content-subcategories', form);
  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/admin/content'), undefined, { revalidate: true });
  return result;
}

// 중분류 수정 함수
export async function updateSubcategory(id: number, form: SubcategoryForm): Promise<ApiResponse<ContentSubcategory>> {
  const result = await apiClient.put<ContentSubcategory>(`/admin/content-subcategories/${id}`, form);
  globalMutate(`/admin/content-subcategories/${id}`);
  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/admin/content'), undefined, { revalidate: true });
  return result;
}

// 중분류 삭제 함수
export async function deleteSubcategory(id: number): Promise<void> {
  await apiClient.delete(`/admin/content-subcategories/${id}`);
  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/admin/content'), undefined, { revalidate: true });
}
