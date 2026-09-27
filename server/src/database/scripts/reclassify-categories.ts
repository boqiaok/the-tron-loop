import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { IngestionService } from '../../modules/ingestion/ingestion.service';

/**
 * Recomputes imported activities' categories from their latest source data.
 * Prints the changes; pass --apply to save them.
 */
async function reclassifyCategories(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const result = await app.get(IngestionService).reclassifyCategories(apply);

    const groups = new Map<string, string[]>();
    for (const change of result.changes) {
      const key = `${change.from} → ${change.to}`;
      groups.set(key, [
        ...(groups.get(key) ?? []),
        `${change.title} (${change.status})`,
      ]);
    }
    for (const [key, titles] of [...groups].sort(
      (left, right) => right[1].length - left[1].length,
    )) {
      console.log(`\n${key} (${titles.length})`);
      for (const title of titles.sort()) console.log(`  ${title}`);
    }

    if (result.unknownLabels.length) {
      console.log('\nSource categories not in the mapping:');
      for (const { label, count } of result.unknownLabels) {
        console.log(`  ${label} (${count})`);
      }
    }
    for (const { title, error } of result.failed) {
      console.log(`\nCould not categorise "${title}": ${error}`);
    }

    console.log(
      `\n${result.changes.length} to change, ${result.unchanged} unchanged, ${result.failed.length} failed.`,
    );
    console.log(
      apply
        ? 'Saved.'
        : 'Nothing saved. Run again with --apply to save these changes.',
    );
  } finally {
    await app.close();
  }
}

void reclassifyCategories();
