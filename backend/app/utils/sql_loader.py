# ============================================
# SQL 파일 로더
# ============================================
# sql/ 폴더의 SQL 파일을 로드하는 유틸리티

from pathlib import Path
from typing import Dict
from functools import lru_cache

from app.core.logger import logger


# SQL 파일 디렉토리
SQL_DIR = Path(__file__).parent.parent.parent / "sql"


@lru_cache(maxsize=100)
def load_sql(filename: str, query_name: str) -> str:
    """
    SQL 파일에서 특정 쿼리 로드
    
    SQL 파일 형식:
        -- query_name: get_user_by_id
        SELECT * FROM users WHERE id = %(user_id)s;
        
        -- query_name: list_users
        SELECT * FROM users;
    
    Args:
        filename: SQL 파일명 (확장자 제외)
        query_name: 쿼리 이름
    
    Returns:
        SQL 쿼리 문자열
    
    Raises:
        FileNotFoundError: SQL 파일이 없을 때
        ValueError: 쿼리를 찾지 못했을 때
    """
    sql_file = SQL_DIR / f"{filename}.sql"
    
    if not sql_file.exists():
        raise FileNotFoundError(f"SQL 파일을 찾을 수 없습니다: {sql_file}")
    
    content = sql_file.read_text(encoding="utf-8")
    queries = parse_sql_file(content)
    
    if query_name not in queries:
        raise ValueError(f"쿼리를 찾을 수 없습니다: {query_name} in {filename}.sql")
    
    return queries[query_name]


def parse_sql_file(content: str) -> Dict[str, str]:
    """
    SQL 파일 파싱
    
    Args:
        content: SQL 파일 내용
    
    Returns:
        {쿼리명: SQL문} 딕셔너리
    """
    queries = {}
    current_name = None
    current_sql = []
    
    for line in content.split('\n'):
        stripped = line.strip()
        
        # 쿼리 이름 주석 확인
        if stripped.startswith('-- query_name:'):
            # 이전 쿼리 저장
            if current_name and current_sql:
                queries[current_name] = '\n'.join(current_sql).strip()
            
            # 새 쿼리 시작
            current_name = stripped.replace('-- query_name:', '').strip()
            current_sql = []
        elif current_name is not None:
            # 쿼리 내용 추가
            current_sql.append(line)
    
    # 마지막 쿼리 저장
    if current_name and current_sql:
        queries[current_name] = '\n'.join(current_sql).strip()
    
    return queries


def load_sql_direct(filename: str) -> str:
    """
    SQL 파일 전체 내용 로드
    
    Args:
        filename: SQL 파일명 (확장자 제외)
    
    Returns:
        SQL 파일 전체 내용
    """
    sql_file = SQL_DIR / f"{filename}.sql"
    
    if not sql_file.exists():
        raise FileNotFoundError(f"SQL 파일을 찾을 수 없습니다: {sql_file}")
    
    return sql_file.read_text(encoding="utf-8")


# ============================================
# SQLLoader 클래스 (새로운 방식)
# ============================================

class SQLLoader:
    """
    SQL 파일에서 쿼리 로드 (-- name: 형식 지원)
    
    사용:
        sql = SQLLoader("challenges")
        query = sql.get("get_challenges_list")
    """

    def __init__(self, module_name: str):
        """
        Args:
            module_name: sql 폴더 내 파일명 (확장자 제외)
        """
        self.module_name = module_name
        self.queries = self._load()

    def _load(self) -> Dict[str, str]:
        """SQL 파일 파싱 (-- name: 형식)"""
        sql_file = SQL_DIR / f"{self.module_name}.sql"

        if not sql_file.exists():
            raise FileNotFoundError(f"SQL 파일을 찾을 수 없습니다: {sql_file}")

        content = sql_file.read_text(encoding="utf-8")
        queries = {}
        current_name = None
        current_sql = []

        for line in content.split('\n'):
            stripped = line.strip()

            # -- name: query_name 형식 확인
            if stripped.startswith('-- name:'):
                # 이전 쿼리 저장
                if current_name and current_sql:
                    queries[current_name] = '\n'.join(current_sql).strip()

                # 새 쿼리 시작
                current_name = stripped.replace('-- name:', '').strip()
                current_sql = []
            elif current_name is not None:
                # 쿼리 내용 추가
                current_sql.append(line)

        # 마지막 쿼리 저장
        if current_name and current_sql:
            queries[current_name] = '\n'.join(current_sql).strip()

        return queries

    def get(self, name: str) -> str:
        """쿼리 반환"""
        if name not in self.queries:
            raise KeyError(f"쿼리를 찾을 수 없습니다: {name} ({self.module_name}.sql)")
        return self.queries[name]


def get_sql(module: str) -> SQLLoader:
    """SQLLoader 생성 (개발 환경에서 실시간 SQL 수정 지원)"""
    # 개발 환경에서는 캐시하지 않음 - SQL 파일 변경 즉시 반영
    return SQLLoader(module)


