# ============================================
# 로깅 설정
# ============================================
# 일별 로테이션 및 포맷 설정

import logging
import sys
from datetime import datetime
from pathlib import Path


# 로그 디렉토리 생성
LOG_DIR = Path(__file__).parent.parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

# 로그 포맷 설정
LOG_FORMAT = "[%(asctime)s] %(levelname)s [%(name)s:%(lineno)d] - %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


class DailyRotatingHandler(logging.FileHandler):
    """일별 로테이션 핸들러"""
    
    def __init__(self, log_dir: Path, prefix: str = "app"):
        self.log_dir = log_dir
        self.prefix = prefix
        self.current_date = datetime.now().strftime("%Y-%m-%d")
        
        log_file = self._get_log_filename()
        super().__init__(log_file, encoding="utf-8")
    
    def _get_log_filename(self) -> Path:
        """현재 날짜 기반 로그 파일명 반환"""
        return self.log_dir / f"{self.prefix}_{self.current_date}.log"
    
    def emit(self, record):
        """로그 기록 시 날짜 변경 확인"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        if today != self.current_date:
            self.current_date = today
            self.close()
            self.baseFilename = str(self._get_log_filename())
            self.stream = self._open()
        
        super().emit(record)


def setup_logger(name: str = "oni_care") -> logging.Logger:
    """로거 설정 및 반환"""
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)
    
    # 기존 핸들러 제거
    logger.handlers.clear()
    
    # 콘솔 핸들러
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))
    logger.addHandler(console_handler)
    
    # 파일 핸들러 (일별 로테이션)
    file_handler = DailyRotatingHandler(LOG_DIR, prefix="app")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))
    logger.addHandler(file_handler)
    
    # 에러 전용 파일 핸들러
    error_handler = DailyRotatingHandler(LOG_DIR, prefix="error")
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))
    logger.addHandler(error_handler)
    
    return logger


# 전역 로거 인스턴스
logger = setup_logger()


