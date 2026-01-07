// ============================================
// 기능성 성분 관리 Hook
// ============================================

import { useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';

// 기능성 성분 검색 필터 타입
export interface FunctionalIngredientSearchFilters {
  ingredient_code?: string;
  internal_name?: string;
  external_name?: string;
  indicator_component?: string;
  functionality?: string;
  functionality_code?: string;
  search?: string;
}

// 기능성 성분 타입
export interface FunctionalIngredient {
  id: number;
  ingredient_code: string | null;
  internal_name: string;
  external_name: string;
  indicator_component: string | null;
  daily_intake_unit: string | null;
  daily_intake_min: number | null;
  daily_intake_max: number | null;
  display_functionality: string | null;
  is_active: boolean;
  priority_display: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// 기능성 내용 타입
export interface FunctionalityContent {
  id: number;
  functionality_code: string;
  content: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 성분-기능성 매핑 타입
export interface IngredientFunctionality {
  mapping_id: number;
  functionality_id: number;
  functionality_code: string;
  content: string;
  description: string | null;
  display_order: number;
}

interface FunctionalIngredientListResponse {
  success: boolean;
  data: FunctionalIngredient[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface FunctionalIngredientDetailResponse {
  success: boolean;
  data: FunctionalIngredient;
}

interface IngredientFunctionalityResponse {
  success: boolean;
  data: IngredientFunctionality[];
}

interface FunctionalityContentListResponse {
  success: boolean;
  data: FunctionalityContent[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// Next.js API 라우트용 fetcher (내부 API)
const internalFetcher = async (url: string) => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn(`[useFunctionalIngredients] API 에러: ${response.status}`, errorData);
      // 에러를 throw하지 않고 빈 데이터 반환
      return { success: false, data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
    }
    
    return response.json();
  } catch (error) {
    console.warn('[useFunctionalIngredients] 네트워크 에러:', error);
    return { success: false, data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
  }
};

// 내부 API 요청 함수
async function internalRequest<T>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: unknown
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      if (!window.location.pathname.includes('/login')) {
        window.location.replace('/login');
      }
    }
    throw new Error('인증이 필요합니다.');
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || '요청 처리 중 오류가 발생했습니다.');
  }
  
  return data;
}

// 필터를 쿼리스트링으로 변환
function filtersToQuery(
  filters: FunctionalIngredientSearchFilters,
  page: number,
  pageSize: number
): string {
  const params = new URLSearchParams();

  if (filters.ingredient_code) params.append('ingredient_code', filters.ingredient_code);
  if (filters.internal_name) params.append('internal_name', filters.internal_name);
  if (filters.external_name) params.append('external_name', filters.external_name);
  if (filters.indicator_component) params.append('indicator_component', filters.indicator_component);
  if (filters.functionality) params.append('functionality', filters.functionality);
  if (filters.functionality_code) params.append('functionality_code', filters.functionality_code);
  if (filters.search) params.append('search', filters.search);

  params.append('page', String(page));
  params.append('page_size', String(pageSize));

  return params.toString();
}

// 기능성 성분 목록 조회
export function useFunctionalIngredients(
  filters: FunctionalIngredientSearchFilters,
  page: number = 1,
  pageSize: number = 50
) {
  const queryString = filtersToQuery(filters, page, pageSize);
  const { data, error, isLoading, mutate } = useSWR<FunctionalIngredientListResponse>(
    `/api/admin/functional-ingredients?${queryString}`,
    internalFetcher,
    { revalidateOnFocus: false }
  );

  return {
    ingredients: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch: () => mutate(),
  };
}

// 기능성 성분 상세 조회
export function useFunctionalIngredientDetail(id: number | null) {
  const { data, error, isLoading, mutate } = useSWR<FunctionalIngredientDetailResponse>(
    id ? `/api/admin/functional-ingredients/${id}` : null,
    internalFetcher,
    { revalidateOnFocus: false }
  );

  return {
    ingredient: data?.data,
    isLoading,
    error,
    refetch: () => mutate(),
  };
}

// 기능성 성분에 매핑된 기능성 내용 조회
export function useIngredientFunctionalities(ingredientId: number | null) {
  const { data, error, isLoading, mutate } = useSWR<IngredientFunctionalityResponse>(
    ingredientId ? `/api/admin/functional-ingredients/${ingredientId}/functionalities` : null,
    internalFetcher,
    { revalidateOnFocus: false }
  );

  return {
    functionalities: data?.data || [],
    isLoading,
    error,
    refetch: () => mutate(),
  };
}

// 기능성 성분 생성
export function useCreateFunctionalIngredient() {
  const [isCreating, setIsCreating] = useState(false);

  const createIngredient = async (data: Partial<FunctionalIngredient>) => {
    setIsCreating(true);
    try {
      const result = await internalRequest<{ success: boolean; data: { id: number } }>(
        '/api/admin/functional-ingredients',
        'POST',
        data
      );
      globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/admin/functional-ingredients'), undefined, { revalidate: true });
      return result;
    } finally {
      setIsCreating(false);
    }
  };

  return { createIngredient, isCreating };
}

// 기능성 성분 수정
export function useUpdateFunctionalIngredient(id: number | null) {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateIngredient = async (data: Partial<FunctionalIngredient>) => {
    if (!id) return;
    setIsUpdating(true);
    try {
      const result = await internalRequest<{ success: boolean; data: { id: number } }>(
        `/api/admin/functional-ingredients/${id}`,
        'PUT',
        data
      );
      globalMutate(`/api/admin/functional-ingredients/${id}`);
      globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/admin/functional-ingredients'), undefined, { revalidate: true });
      return result;
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateIngredient, isUpdating };
}

// 기능성 성분 삭제
export function useDeleteFunctionalIngredients() {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteIngredients = async (data: { ids: number[] }) => {
    setIsDeleting(true);
    try {
      const result = await internalRequest<{ success: boolean }>(
        '/api/admin/functional-ingredients',
        'DELETE',
        data
      );
      globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/admin/functional-ingredients'), undefined, { revalidate: true });
      return result;
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteIngredients, isDeleting };
}

// 기능성 성분에 기능성 내용 매핑 추가
export function useAddIngredientFunctionalities(ingredientId: number | null) {
  const [isAdding, setIsAdding] = useState(false);

  const addFunctionalities = async (data: { functionality_ids: number[] }) => {
    if (!ingredientId) return;
    setIsAdding(true);
    try {
      const result = await internalRequest<{ success: boolean }>(
        `/api/admin/functional-ingredients/${ingredientId}/functionalities`,
        'POST',
        data
      );
      globalMutate(`/api/admin/functional-ingredients/${ingredientId}/functionalities`);
      return result;
    } finally {
      setIsAdding(false);
    }
  };

  return { addFunctionalities, isAdding };
}

// 기능성 성분에서 기능성 내용 매핑 제거
export function useRemoveIngredientFunctionalities(ingredientId: number | null) {
  const [isRemoving, setIsRemoving] = useState(false);

  const removeFunctionalities = async (data: { functionality_ids: number[] }) => {
    if (!ingredientId) return;
    setIsRemoving(true);
    try {
      const result = await internalRequest<{ success: boolean }>(
        `/api/admin/functional-ingredients/${ingredientId}/functionalities`,
        'DELETE',
        data
      );
      globalMutate(`/api/admin/functional-ingredients/${ingredientId}/functionalities`);
      return result;
    } finally {
      setIsRemoving(false);
    }
  };

  return { removeFunctionalities, isRemoving };
}

// 기능성 내용 목록 조회
export function useFunctionalityContents(search?: string, page: number = 1, pageSize: number = 50) {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('page_size', String(pageSize));
  if (search) params.append('search', search);

  const { data, error, isLoading, mutate } = useSWR<FunctionalityContentListResponse>(
    `/api/admin/functionality-contents?${params.toString()}`,
    internalFetcher,
    { revalidateOnFocus: false }
  );

  return {
    contents: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch: () => mutate(),
  };
}
