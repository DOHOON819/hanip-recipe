# 한입 레시피

실제 사용자 계정으로 짧은 조리 영상을 올리고, 재료·조리 순서와 함께 공유하는 Supabase 기반 웹앱입니다.

## 실제로 동작하는 기능

- 이메일·비밀번호 회원가입과 로그인
- 사용자별 프로필 생성 및 작성자 표시
- MP4, WebM, MOV 조리 영상의 브라우저 직접 업로드 (최대 100MB)
- 대용량 영상의 재개 가능한 업로드와 진행률 표시
- 공개 레시피 피드, 검색, 카테고리 필터, 영상 재생, 재료·조리 순서 상세 보기
- Supabase Row Level Security로 본인 레시피와 본인 폴더의 영상만 작성·수정·삭제

## Supabase 구성

`supabase/schema.sql`을 Supabase SQL Editor에서 실행하면 다음이 생성됩니다.

- `profiles`, `recipes`, `recipe_ingredients`, `recipe_steps`, `recipe_saves` 테이블
- `recipe-videos` 공개 Storage 버킷
- 사용자 소유권을 강제하는 RLS 정책

`config.js`에는 브라우저에서 공개해도 안전한 Supabase Publishable Key만 있습니다. 비밀 키는 이 프로젝트에 사용하거나 저장하지 않습니다.

## 운영 전 확인할 항목

- Supabase Authentication의 Site URL과 Redirect URL에 최종 Vercel 주소를 등록합니다.
- 이메일 확인이 켜져 있으면 회원가입 사용자는 메일 인증 후 로그인합니다.
- 공개 영상은 업로드 사용량과 공개 범위를 고려해 운영합니다.

## 배포

별도 빌드가 없는 정적 웹앱입니다. Git에 올린 뒤 Vercel에서 프로젝트로 가져오거나 Vercel CLI로 배포할 수 있습니다.
