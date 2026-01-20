/**
 * 챌린지 관리 데이터 훅
 */
import useSWR from 'swr';
import { apiClient, swrFetcher } from '@/lib/api-client';

// ============================================
// 타입 정의
// ============================================

export interface Challenge {
  id: string;
  challenge_type: string;
  verification_method: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  max_participants: number | null;
  challenge_duration_days: number;
  display_order: number;
  recruitment_start_date: string | null;
  recruitment_end_date: string | null;
  operation_start_date: string | null;
  operation_end_date: string | null;
  display_start_date: string | null;
  display_end_date: string | null;
  visibility_scope: string[];
  company_codes: string[];
  store_visible: boolean;
  rank_display_type: string;
  is_active: boolean;
  is_suspended: boolean;
  status: string;
  current_participants: number;
  daily_verification_count: number;
  daily_verification_settings: DailyVerificationSetting[];
  daily_achievement_count: number;
  total_achievement_days: number | null;
  reward_settings: RewardSettings;
  type_settings: Record<string, unknown>;
  images: ChallengeImages;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface DailyVerificationSetting {
  order: number;
  start_time: string;
  end_time: string;
  push_enabled: boolean;
  push_message?: string;
}

export interface RewardSettings {
  stamp_enabled: boolean;
  stamp_count: number;
  stamp_reward?: {
    type: 'coupon' | 'point';
    coupon_id?: string;
    point_amount?: number;
  };
  completion_reward?: {
    type: 'coupon' | 'point';
    coupon_id?: string;
    point_amount?: number;
  };
}

export interface ChallengeImages {
  thumbnail: string | null;
  total_achievement_success: string | null;
  total_achievement_bg: string | null;
  verification_header: string | null;
  today_achievement_bg: string | null;
  today_achievement_success: string | null;
  detail_pages: string[];
}

export interface ChallengeSearchFilters {
  title?: string;
  challenge_type?: string;
  verification_method?: string;
  visibility_scope?: string[];
  status?: string[];
  operation_from?: string;
  operation_to?: string;
  recruitment_from?: string;
  recruitment_to?: string;
  display_from?: string;
  display_to?: string;
}

export interface ChallengeListResponse {
  items: Challenge[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ChallengeQuiz {
  id: string;
  quiz_name: string;
  quiz_type: 'multiple_choice' | 'ox';
  question: string;
  options: string[];
  correct_answers: number[];
  hint: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface QuizListResponse {
  items: ChallengeQuiz[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// 챌린지 목록 조회 훅
// ============================================

export function useChallenges(
  filters: ChallengeSearchFilters = {},
  page: number = 1,
  limit: number = 20
) {
  // 쿼리 파라미터 구성
  const queryParams = new URLSearchParams();
  
  if (filters.title) queryParams.append('title', filters.title);
  if (filters.challenge_type) queryParams.append('challenge_type', filters.challenge_type);
  if (filters.verification_method) queryParams.append('verification_method', filters.verification_method);
  if (filters.visibility_scope?.length) queryParams.append('visibility_scope', filters.visibility_scope.join(','));
  if (filters.status?.length) queryParams.append('status', filters.status.join(','));
  if (filters.operation_from) queryParams.append('operation_from', filters.operation_from);
  if (filters.operation_to) queryParams.append('operation_to', filters.operation_to);
  if (filters.recruitment_from) queryParams.append('recruitment_from', filters.recruitment_from);
  if (filters.recruitment_to) queryParams.append('recruitment_to', filters.recruitment_to);
  if (filters.display_from) queryParams.append('display_from', filters.display_from);
  if (filters.display_to) queryParams.append('display_to', filters.display_to);
  queryParams.append('page', page.toString());
  queryParams.append('limit', limit.toString());

  const { data, error, isLoading, mutate } = useSWR<ChallengeListResponse>(
    `/challenges?${queryParams.toString()}`,
    swrFetcher
  );

  return {
    challenges: data?.items || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch: mutate,
  };
}

// ============================================
// 챌린지 상세 조회 훅
// ============================================

export function useChallenge(challengeId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Challenge>(
    challengeId ? `/challenges/${challengeId}` : null,
    swrFetcher
  );

  return {
    challenge: data,
    isLoading,
    error,
    refetch: mutate,
  };
}

// ============================================
// 챌린지 CRUD 함수
// ============================================

export async function createChallenge(data: Partial<Challenge>): Promise<Challenge | undefined> {
  const response = await apiClient.post<Challenge>('/challenges', data);
  return response.data;
}

export async function updateChallenge(challengeId: string, data: Partial<Challenge>): Promise<Challenge | undefined> {
  const response = await apiClient.put<Challenge>(`/challenges/${challengeId}`, data);
  return response.data;
}

export async function deleteChallenges(challengeIds: string[]): Promise<{ message: string; count: number } | undefined> {
  const queryParams = challengeIds.map(id => `challenge_ids=${id}`).join('&');
  const response = await apiClient.delete<{ message: string; count: number }>(`/challenges?${queryParams}`);
  return response.data;
}

// ============================================
// 퀴즈 관리 훅
// ============================================

export function useQuizzes(
  quizName?: string,
  quizType?: string,
  page: number = 1,
  limit: number = 20
) {
  const queryParams = new URLSearchParams();
  if (quizName) queryParams.append('quiz_name', quizName);
  if (quizType) queryParams.append('quiz_type', quizType);
  queryParams.append('page', page.toString());
  queryParams.append('limit', limit.toString());

  const { data, error, isLoading, mutate } = useSWR<QuizListResponse>(
    `/challenges/quizzes/list?${queryParams.toString()}`,
    swrFetcher
  );

  return {
    quizzes: data?.items || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch: mutate,
  };
}

export function useQuiz(quizId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ChallengeQuiz>(
    quizId ? `/challenges/quizzes/${quizId}` : null,
    swrFetcher
  );

  return {
    quiz: data,
    isLoading,
    error,
    refetch: mutate,
  };
}

// ============================================
// 퀴즈 CRUD 함수
// ============================================

export async function createQuiz(data: Partial<ChallengeQuiz>): Promise<ChallengeQuiz | undefined> {
  const response = await apiClient.post<ChallengeQuiz>('/challenges/quizzes', data);
  return response.data;
}

export async function updateQuiz(quizId: string, data: Partial<ChallengeQuiz>): Promise<ChallengeQuiz | undefined> {
  const response = await apiClient.put<ChallengeQuiz>(`/challenges/quizzes/${quizId}`, data);
  return response.data;
}

export async function deleteQuizzes(quizIds: string[]): Promise<{ message: string; count: number } | undefined> {
  const queryParams = quizIds.map(id => `quiz_ids=${id}`).join('&');
  const response = await apiClient.delete<{ message: string; count: number }>(`/challenges/quizzes?${queryParams}`);
  return response.data;
}

// ============================================
// 챌린지-퀴즈 연결 함수
// ============================================

export function useChallengeQuizzes(challengeId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ChallengeQuiz[]>(
    challengeId ? `/challenges/${challengeId}/quizzes` : null,
    swrFetcher
  );

  return {
    quizzes: data || [],
    isLoading,
    error,
    refetch: mutate,
  };
}

export async function addQuizToChallenge(
  challengeId: string,
  quizId: string,
  displayOrder?: number
): Promise<unknown> {
  const queryParams = displayOrder !== undefined ? `?display_order=${displayOrder}` : '';
  const response = await apiClient.post(`/challenges/${challengeId}/quizzes/${quizId}${queryParams}`, {});
  return response.data;
}

export async function removeQuizFromChallenge(
  challengeId: string,
  quizId: string
): Promise<{ message: string; success: boolean } | undefined> {
  const response = await apiClient.delete<{ message: string; success: boolean }>(`/challenges/${challengeId}/quizzes/${quizId}`);
  return response.data;
}

// ============================================
// 퀴즈 관리용 챌린지 목록 훅
// ============================================

export function useQuizManagementChallenges(
  filters: ChallengeSearchFilters = {}
) {
  const queryParams = new URLSearchParams();
  
  if (filters.title) queryParams.append('title', filters.title);
  if (filters.visibility_scope?.length) queryParams.append('visibility_scope', filters.visibility_scope.join(','));
  if (filters.status?.length) queryParams.append('status', filters.status.join(','));
  if (filters.operation_from) queryParams.append('operation_from', filters.operation_from);
  if (filters.operation_to) queryParams.append('operation_to', filters.operation_to);
  if (filters.recruitment_from) queryParams.append('recruitment_from', filters.recruitment_from);
  if (filters.recruitment_to) queryParams.append('recruitment_to', filters.recruitment_to);
  if (filters.display_from) queryParams.append('display_from', filters.display_from);
  if (filters.display_to) queryParams.append('display_to', filters.display_to);

  const { data, error, isLoading, mutate } = useSWR<Challenge[]>(
    `/challenges/quiz-management/challenges?${queryParams.toString()}`,
    swrFetcher
  );

  return {
    challenges: data || [],
    isLoading,
    error,
    refetch: mutate,
  };
}

