# TREND_ONE 로컬 PostgreSQL 개발 환경 매뉴얼

다른 PC에서 프로젝트를 받은 뒤 Docker PostgreSQL, 테이블, 샘플 XLSX 데이터를 구성하는 절차입니다.

## 1. 준비

- Git
- Docker Desktop(Windows에서는 WSL 2 사용 권장)
- Java 11 이상
- Python 3.x 및 openpyxl
- IntelliJ IDEA

Docker Desktop 설치 후 PowerShell을 새로 열고 다음 명령으로 확인합니다.

    docker --version
    docker compose version
    python --version

docker 명령을 찾을 수 없으면 Docker Desktop을 실행하고 PowerShell을 다시 엽니다.

## 2. 프로젝트 받기

    git clone <저장소 주소> TREND_ONE
    cd TREND_ONE

## 3. PostgreSQL 실행

프로젝트 루트에서 실행합니다.

    docker compose up -d postgres
    docker compose ps
    docker compose exec postgres pg_isready -U trend_one -d trend_one_dev

기본 접속 정보는 다음과 같습니다.

| 항목 | 값 |
|---|---|
| 컨테이너 | trend-one-postgres |
| 데이터베이스 | trend_one_dev |
| 사용자 | trend_one |
| 비밀번호 | trend_one_dev |
| 호스트 포트 | 5433 |

데이터는 trend-one-postgres-data Docker 볼륨에 보존됩니다.

## 4. 테이블 생성

새로운 Docker 볼륨을 처음 생성하면 docker/postgres/init/001_schema.sql이 자동 실행됩니다.

    docker compose exec postgres psql -U trend_one -d trend_one_dev -c "\dt"

다음 6개 테이블이 표시되어야 합니다.

    t_mbr
    t_region_cd
    t_governor
    t_governor_stat
    t_file_upload_log
    gvrnr_mng_sys_app_transaction

이미 생성된 볼륨에 SQL을 다시 적용해야 한다면 다음 명령을 사용합니다.

    Get-Content -Raw .\docker\postgres\init\001_schema.sql |
      docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U trend_one -d trend_one_dev

## 5. XLSX 샘플 적재

다음 파일이 프로젝트에 있어야 합니다.

    docs/t_region_cd_202607161759.xlsx
    docs/t_governor_202607161800.xlsx
    docs/t_governor_stat_202607161800.xlsx

Python 의존성이 없다면 설치합니다.

    python -m pip install openpyxl

샘플 데이터를 적재합니다.

    python .\scripts\seed_local_db.py

Docker 명령이 PATH에 없으면 실행 파일 경로를 직접 지정합니다.

    python .\scripts\seed_local_db.py --docker "C:\Users\<사용자명>\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe"

스크립트는 t_region_cd, t_governor, t_governor_stat만 초기화 후 재적재합니다. 예상 행 수는 지역 코드 245건, 정압기 301건, 통계 168,135건입니다.

## 6. IntelliJ 백엔드 연결

1. backend 폴더를 Gradle 프로젝트로 엽니다.
2. 실행 → 실행/디버그 구성 편집…을 선택합니다.
3. GovTrendApplication을 선택합니다.
4. 환경 변수에 다음 값을 추가합니다.

    DB_URL=jdbc:postgresql://localhost:5433/trend_one_dev
    DB_USERNAME=trend_one
    DB_PASSWORD=trend_one_dev
    SPRING_PROFILES_ACTIVE=dev

5. Java 11 런타임을 선택하고 적용한 뒤 GovTrendApplication을 실행합니다.

개발 로그인은 admin / 123입니다.

## 7. 샘플 조회 기간

샘플 통계 데이터는 2022-04-04 ~ 2022-04-17 기간입니다. 대시보드에서 이 기간을 입력해야 조회됩니다.

## 8. 중지와 재시작

컨테이너만 중지하면 데이터는 유지됩니다.

    docker compose down
    docker compose up -d postgres

## 9. DB 완전 초기화

개발 DB를 완전히 초기화할 때만 실행합니다.

    docker compose down -v
    docker compose up -d postgres
    python .\scripts\seed_local_db.py

docker compose down -v는 PostgreSQL 데이터 볼륨을 삭제하므로 운영 DB나 보존해야 할 DB에서는 실행하지 않습니다.

## 10. 백업과 복원

백업:

    docker compose exec -T postgres pg_dump -U trend_one -d trend_one_dev > trend_one_dev_backup.sql

복원:

    Get-Content -Raw .\trend_one_dev_backup.sql |
      docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U trend_one -d trend_one_dev

백업 파일에는 개발 데이터가 포함될 수 있으므로 Git에 커밋하지 않습니다.

## 11. 문제 해결

- Docker API permission denied: Docker Desktop 실행 여부를 확인하고 PowerShell을 새로 엽니다.
- relation does not exist: 4절의 SQL 수동 적용 명령을 실행합니다.
- 조회 결과 없음: 검색 기간을 2022-04-04 ~ 2022-04-17로 지정합니다.
- 5433 포트 사용 중: $env:POSTGRES_PORT = "55432" 설정 후 컨테이너를 실행하고 IntelliJ DB_URL 포트도 55432로 변경합니다.
