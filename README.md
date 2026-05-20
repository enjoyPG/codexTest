# Todo Studio

Firebase Firestore를 사용하는 정적 Todo 앱입니다.

## 기능

- 할 일 추가
- 완료 체크
- 전체 / 진행 / 완료 필터
- 완료 항목 삭제
- Firestore 실시간 동기화

## Firebase 설정

1. Firebase Console에서 프로젝트를 만듭니다.
2. Firestore Database를 생성합니다.
3. Project settings > General > Your apps에서 Web app을 추가합니다.
4. SDK 설정의 `firebaseConfig` 값을 `firebase-config.js`에 붙여넣습니다.
5. Firestore Rules를 앱 목적에 맞게 설정합니다.

테스트용으로만 잠깐 사용할 수 있는 규칙 예시:

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /todos/{todoId} {
      allow read, write: if true;
    }
  }
}
```

공개 앱에서는 위 규칙을 그대로 쓰면 누구나 데이터를 읽고 쓸 수 있습니다. 실제 운영에는 Firebase Authentication을 붙이고 사용자별 권한 규칙으로 바꾸세요.

## GitHub Pages 배포

GitHub Pages 설정:

- Source: `Deploy from a branch`
- Branch: `gh-pages` 또는 `main`
- Folder: `/(root)`
