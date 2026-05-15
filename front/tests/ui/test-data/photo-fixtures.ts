import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const FIXTURE_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURE_IMAGE = join(FIXTURE_DIR, "borsch.png");

function assertFixtureImageExists(): void {
  if (!existsSync(FIXTURE_IMAGE)) {
    throw new Error(
      `Фикстура фото не найдена: ${FIXTURE_IMAGE} (ожидается borsch.png в test-data)`,
    );
  }
}

export function createTempPngFiles(count: number): {
  paths: string[];
  dispose: () => void;
} {
  assertFixtureImageExists();

  const dir = join(
    tmpdir(),
    `recipe_ui_photo_${randomBytes(8).toString("hex")}`,
  );
  mkdirSync(dir, { recursive: true });
  const paths: string[] = [];
  for (let i = 0; i < count; i++) {
    const p = join(dir, `f${i}.png`);
    copyFileSync(FIXTURE_IMAGE, p);
    paths.push(p);
  }
  return {
    paths,
    dispose: () => {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {}
    },
  };
}

export function getFixtureImagePath(): string {
  assertFixtureImageExists();
  return FIXTURE_IMAGE;
}
