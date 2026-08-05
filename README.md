# C2KOR

외국인 선원(어선·상선)을 위한 안전/생활 정보 정적 웹사이트. 서버나 빌드 도구 없이 순수 HTML/CSS/JS로 동작하며, QR코드로 각 페이지에 바로 접근할 수 있도록 설계되었습니다. 모든 콘텐츠는 `data/site-content.json` 하나로 관리되는 데이터 기반 구조입니다.

## 실행하기

콘텐츠 데이터가 `assets/js/site-content-data.js`에 미리 내장되어 있어 `index.html`을 그냥 더블클릭해서 열어도(`file://`) 정상 동작합니다. 별도 서버가 필요 없습니다.

로컬 웹 서버로 열고 싶다면(선택 사항):

```
cd c:\seafarer-info-web
python -m http.server 8080
```

그 후 브라우저에서 `http://localhost:8080` 접속.

## 언어 규칙

- **영어가 항상 기본이자 첫 번째**로 렌더링됩니다. 브라우저 언어와 무관하게, 이전에 언어를 선택해 `localStorage`에 저장해둔 경우가 아니면 항상 영어로 시작합니다.
- **한국어가 항상 두 번째**로 언어 선택기에 노출됩니다.
- 나머지 언어는 `data/site-content.json`의 `meta.languages[code].status`가 `"complete"`가 아니면 선택기에 표시되지 않습니다. 현재는 `en`/`ko`만 `complete`이며, `vi/id/tl/my/th/zh/km`은 콘텐츠가 준비되면 `status`를 `"complete"`로 바꾸고 해당 언어 블록(`data/site-content.json`의 최상위 키)을 채우면 자동으로 노출됩니다.

## 폴더 구조

```
index.html                                 - 홈 (data-page="home", 동적 렌더링)
pages/*.html                               - 카테고리별 페이지 (각각 <main data-page="..."> 얇은 셸)
pages/qr.html                              - 관리자용 QR 모음 (data-page="static", 다국어 대상 아님)
data/site-content.json                     - 전체 콘텐츠 원본 (언어별 텍스트, meta.pageOrder/languageOrder)
assets/css/style.css                       - 전체 스타일 (모바일 우선, 한국 전통 문양 포인트)
assets/js/i18n.js                          - 언어 상태 관리(감지/전환), 렌더링은 하지 않음
assets/js/content-render.js                - site-content.json 스키마 -> DOM 렌더링 엔진
assets/js/components.js                    - 공통 헤더(언어 선택, 내비게이션), 긴급버튼
assets/js/app.js                           - 부트스트랩 + 이미지 저장 버튼/검색 링크 삽입
assets/js/save-image.js                    - 현재 페이지를 PNG로 저장하는 기능 (Canvas API, 외부 라이브러리 없음)
assets/js/site-content-data.js             - 자동 생성 파일. data/site-content.json을 번들링한 결과 (직접 수정 금지)
assets/qr/                                 - generate_qr.py 산출물 (QR PNG)
tools/generate_qr.py, tools/config.json    - QR코드 생성 스크립트/설정
tools/bundle_site_content.py               - data/site-content.json -> assets/js/site-content-data.js 번들 스크립트
```

## 콘텐츠 수정하기

1. `data/site-content.json`을 직접 수정합니다. 언어 블록(`en`, `ko`, ...) 안의 `pages.{pageId}`에 해당 페이지 콘텐츠가 있습니다.
2. 수정 후 반드시 아래 명령으로 다시 번들링해야 실제 페이지에 반영됩니다:

```
python tools/bundle_site_content.py
```

(`assets/js/site-content-data.js`는 이 스크립트가 생성하는 파일이므로 직접 편집하지 마세요.)

### 페이지 콘텐츠 스키마

페이지마다 아래 필드 조합으로 콘텐츠를 표현하며, `assets/js/content-render.js`가 필드 유무에 따라 자동으로 다르게 렌더링합니다.

| 필드 | 렌더링 |
|---|---|
| `summary` | 제목 바로 아래 강조 박스 |
| `sections[].heading` + `.body` | `h2` + 문단 (`\n\n`으로 문단 구분, 빈 문자열은 생략) |
| `sections[].subsections[]` | 정의 목록(라벨 + 설명) |
| `sections[].lists[]` | 라벨(선택) + 불릿 목록 |
| `sections[].table` | 반응형 표 (좁은 화면에서 가로 스크롤) |
| `sections[].note` | 주의 문구 박스 |
| `phraseGroups[]` + `tip` | 한국어/발음/의미 표 + 강조 팁 박스 (phrasebook 전용) |
| `contacts[]` | 번호(`tel:` 링크)/서비스/언어 표 (emergency 전용) |
| `referenceLinks[]` | 페이지 최하단 버튼형 링크 목록 |

본문 안의 전화번호(`119`, `1577-0071`, `+82-2-1345` 등)는 정규식으로 자동 인식되어 `tel:` 링크로 바뀝니다.

### 새 언어 추가하기

1. `data/site-content.json`의 `meta.languages.{code}`에 이미 항목이 있다면 `status`를 `"todo"` → `"complete"`로 변경.
2. 최상위에 해당 언어 코드의 블록을 추가하고 `en`/`ko`와 동일한 구조(`home`, `pages.*`)로 번역 채우기.
3. `python tools/bundle_site_content.py` 실행.
4. `meta.languageOrder`에 코드가 이미 있으므로 하드코딩 변경 없이 언어 선택기에 자동 노출됩니다.

## QR코드 생성/재생성

QR코드는 정적 이미지로 미리 생성해 `pages/qr.html`에서 인쇄용으로 모아 보여줍니다. 페이지 경로(`pages/worker-rights.html` 등)는 이번 구조 전환에서도 그대로 유지되므로, 이미 인쇄/배포한 QR코드는 계속 유효합니다.

1. `pip install qrcode[pil]`
2. `tools/config.json`의 `base_url`을 실제 배포 도메인으로 수정.
3. 아래 명령 실행:

```
python tools/generate_qr.py
```

`assets/qr/*.png`가 생성/갱신되며, `pages/qr.html`에서 바로 확인할 수 있습니다. **배포 도메인이 바뀌면 반드시 다시 실행**해야 QR코드가 올바른 주소를 가리킵니다.

## 콘텐츠 관련 주의사항

- `worker-rights` 페이지에는 임금 지급 규칙을 설명하는 전용 섹션이 없습니다 (임금체불 신고 채널은 "진정과 상담" 섹션에 포함되어 있습니다). `CLAUDE_CODE_INSTRUCTIONS.md`의 명시적 지시에 따른 것이며, 되돌리려면 해당 지시서를 먼저 갱신하세요.
- 참고 링크(`referenceLinks`)는 영어 지원 사이트만 사용합니다. 챗봇/AI 위젯은 포함하지 않습니다.
- 이 웹사이트는 정보 제공 목적이며 법적 효력이 없습니다. 배포 전 관계기관(선원노동조합, 외국인노동자지원센터 등) 검토를 권장합니다.
