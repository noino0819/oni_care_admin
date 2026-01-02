// ============================================
// 컨텐츠 카테고리 관리 훅 - SWR 기반 데이터 페칭
// ============================================

import useSWR, { mutate as globalMutate } from 'swr';
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

// 인증 토큰을 포함한 fetcher
const fetcher = async (url: string) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  
  if (!res.ok) {
    throw new Error('데이터를 불러오는데 실패했습니다.');
  }
  
  return res.json();
};

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
    `/api/admin/content-categories?${queryString}`,
    fetcher,
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
    '/api/admin/content-categories/list',
    fetcher,
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
    id ? `/api/admin/content-categories/${id}` : null,
    fetcher,
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
    id ? `/api/admin/content-subcategories/${id}` : null,
    fetcher,
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
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const response = await fetch('/api/admin/content-categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(form),
  });

  if (!response.ok) {
    throw new Error('카테고리 등록에 실패했습니다.');
  }

  const result = await response.json();
  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/admin/content-categories'), undefined, { revalidate: true });
  return result;
}

// 대분류 수정 함수
export async function updateCategory(id: number, form: CategoryForm): Promise<ApiResponse<ContentCategory>> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const response = await fetch(`/api/admin/content-categories/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(form),
  });

  if (!response.ok) {
    throw new Error('카테고리 수정에 실패했습니다.');
  }

  const result = await response.json();
  globalMutate(`/api/admin/content-categories/${id}`);
  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/admin/content-categories'), undefined, { revalidate: true });
  return result;
}

// 대분류 삭제 함수
export async function deleteCategory(id: number): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const response = await fetch(`/api/admin/content-categories/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  if (!response.ok) {
    throw new Error('카테고리 삭제에 실패했습니다.');
  }

  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/admin/content-categories'), undefined, { revalidate: true });
}

// 중분류 등록 함수
export async function createSubcategory(form: SubcategoryForm): Promise<ApiResponse<ContentSubcategory>> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const response = await fetch('/api/admin/content-subcategories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(form),
  });

  if (!response.ok) {
    throw new Error('중분류 등록에 실패했습니다.');
  }

  const result = await response.json();
  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/admin/content'), undefined, { revalidate: true });
  return result;
}

// 중분류 수정 함수
export async function updateSubcategory(id: number, form: SubcategoryForm): Promise<ApiResponse<ContentSubcategory>> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const response = await fetch(`/api/admin/content-subcategories/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(form),
  });

  if (!response.ok) {
    throw new Error('중분류 수정에 실패했습니다.');
  }

  const result = await response.json();
  globalMutate(`/api/admin/content-subcategories/${id}`);
  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/admin/content'), undefined, { revalidate: true });
  return result;
}

// 중분류 삭제 함수
export async function deleteSubcategory(id: number): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const response = await fetch(`/api/admin/content-subcategories/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  if (!response.ok) {
    throw new Error('중분류 삭제에 실패했습니다.');
  }

  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/admin/content'), undefined, { revalidate: true });
}


