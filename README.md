# 한입메뉴

메뉴 탐색, 짧은 조리 영상 미리보기, 레시피 작성·공개를 하나의 화면에 담은 한국어 정적 웹 MVP입니다.

## 포함된 기능

- 모바일 우선 반응형 메뉴 탐색 화면과 데스크톱 고정 내비게이션
- 메뉴·재료 통합 검색, 카테고리 필터, 레시피 상세 보기, 저장 버튼
- 4단계 메뉴 작성 패널: 기본 정보 → 사진·영상 미리보기 → 재료·조리 순서 → 공개 확인
- 재료와 조리 순서의 추가·삭제·위/아래 이동 버튼 및 `Alt + ↑/↓` 키보드 정렬
- 공개 검증: 메뉴 이름, 재료 1개 이상, 조리 순서 1개 이상
- 브라우저 `localStorage` 기반 임시 저장, 공개 메뉴, 저장 메뉴 상태 유지

## 로컬에서 보기

별도 설치가 필요 없는 정적 페이지입니다. `index.html`을 브라우저에서 열거나, 정적 파일 서버를 사용해 확인할 수 있습니다.

## Git에 올리기

```bash
git init
git add index.html styles.css app.js og.png README.md vercel.json .gitignore
git commit -m "Create Hanip Menu static MVP"
git branch -M main
git remote add origin <YOUR_GITHUB_REPOSITORY_URL>
git push -u origin main
```

## Vercel 배포

1. Vercel에서 GitHub 저장소를 **Add New → Project**로 불러옵니다.
2. Framework Preset은 `Other`로 두고 Build Command와 Output Directory는 비워둡니다.
3. Deploy를 누르면 루트의 `index.html`이 정적 사이트로 배포됩니다.

`vercel.json`은 정적 배포에서 보안 응답 헤더와 깔끔한 URL을 설정합니다.

## 데이터 보관 방식

작성한 초안, 공개한 메뉴, 저장한 메뉴는 현재 브라우저에만 저장됩니다. 선택한 사진·영상은 업로드하지 않고 해당 세션의 로컬 미리보기에만 사용됩니다.

## 운영용 확장

실제 서비스로 전환할 때는 영상·이미지는 Vercel Blob 같은 객체 스토리지에 직접 업로드하고, 레시피·작성자·공개 범위는 별도 데이터베이스에 저장하세요. 업로드용 서명 URL, 로그인, 동영상 트랜스코딩·자막 생성은 서버 함수로 분리하면 빠른 화면 로딩과 안전한 대용량 업로드를 함께 유지할 수 있습니다.
