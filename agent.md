# 사진 기반 Minecraft 조형물 작업 기록

## 목표

사용자 사진을 외부 AI API, GPU, 유료 이미지-3D 엔진 없이 Minecraft Java Edition에서 바로 배치할 수 있는 조형물로 변환한다.

이 기능은 사진의 보이는 색상과 알파 채널을 Minecraft 블록으로 변환하는 **결정론적 전면 릴리프(photo relief)** 이다. 사진에 보이지 않는 옆면이나 뒷면을 AI로 추론하는 완전한 3D 모델 생성 기능은 아니다.

## 구현 내용

- 코어 변환기: `packages/core/src/photo-statue.ts`
  - PNG, JPEG, WebP 입력을 Jimp로 읽는다.
  - 설정한 폭으로 비율을 유지해 축소한다.
  - 보이는 픽셀을 기존 Minecraft 팔레트의 가까운 블록으로 매칭한다.
  - 각 픽셀에 고정 깊이를 부여해 voxel grid를 만든다.
  - 투명 픽셀은 제외한다.
- Java CLI 명령: `photo-statue <image>`
  - `--width` (기본 `32`), `--depth` (기본 `4`)
  - `--out`, `--alpha-threshold`, `--white-threshold`
- greedy meshing을 거쳐 `.mcfunction`의 `/fill` 명령 수를 줄인다.
- 생성한 `.mcfunction`은 기존 Java datapack 패키저로 월드에 설치 가능한 datapack으로 만들 수 있다.

## 사용법

```bash
npx airirang-builder photo-statue profile.png \
  --width 32 --depth 4 --out profile-statue.mcfunction
```

Java 1.21 datapack으로 패키징한 후에는 해당 폴더를 월드의 `datapacks` 폴더에 복사하고 게임에서 아래 명령을 실행한다.

```mcfunction
/reload
/function airirang:profile_statue
```

## 입력 이미지 권장 사항

| 입력 | 결과 |
| --- | --- |
| 배경이 투명한 PNG | 인물 또는 물체의 실루엣만 남는 깔끔한 조형물 |
| 일반 JPEG | 배경을 포함한 사각형 사진 릴리프 |
| 배경이 단순한 PNG/JPEG | 블록 색상 매칭이 더 알아보기 쉬운 결과 |

현재 포함된 예제 결과물은 사용자가 제공한 JPEG를 `32 × 32 × 4` 블록으로 변환한 것이다. 4,096개 블록이 greedy meshing을 통해 403개 명령으로 압축됐다.

- 원본 명령 파일: `output/profile-photo-relief.mcfunction`
- Java 1.21 datapack: `output/profile-photo-statue/`

## 제한과 다음 단계

- 이 기능은 무료·로컬 방식이므로 실제 사람의 숨은 형태나 자연스러운 입체를 복원하지 않는다.
- 완전한 3D 모델(GLB/OBJ) 또는 여러 방향의 메시가 필요하면 별도의 이미지-3D 엔진과 GPU 또는 API 비용, 라이선스 검토가 필요하다.
- 상용 서비스에서는 업로드 보안, 이미지 보관·삭제 정책, 저작권 및 초상권 동의, 작업 큐와 결과물 다운로드 화면을 추가로 설계해야 한다.

## 검증

다음 검증을 통과했다.

```bash
npm run build --workspace=airirang-builder-core
npm run build --workspace=airirang-builder
npm run lint
npm test
```

테스트 결과는 Bedrock 20개, Core 1개, Java 40개로 총 61개 통과다.
