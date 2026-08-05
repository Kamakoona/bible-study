# Bible Study

개역한글과 다른 역본을 2단으로 나란히 읽는 웹 앱입니다.

## 실행

```bat
run.bat
```

브라우저에서 http://127.0.0.1:8002 가 열립니다.

## 배포 (Render)

`render.yaml` Blueprint로 배포합니다. Start Command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## 역본

| 위치 | 역본 | 소스 |
|------|------|------|
| 왼쪽 | 개역한글 | 대한성서공회 웹 조회(비공식) |
| 오른쪽 | 새번역, 개역개정, 공동번역 | 대한성서공회 웹 조회(비공식) |
| 오른쪽 | NIV | bolls.life |
| 오른쪽 | 현대인의 성경 | 무료 API 없음 (선택 불가) |

## 기술

- FastAPI + 정적 HTML/CSS/JS
- 대한성서공회 HTML을 서버에서 파싱해 개역한글·새번역 등을 제공합니다.
