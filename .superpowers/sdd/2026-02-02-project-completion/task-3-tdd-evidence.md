# Task 3 TDD evidence

This record makes the Task 3 behavioral-test ordering auditable without changing the final source behavior.

## Red run: pre-implementation snapshot

- **Implementation snapshot:** `ef38374b137040fd44a12b251900ad17c54aa20e` (`ef38374`)
- **Test snapshot:** `af35fd3`'s `tests/unit/task-3-behavior.test.ts`
- **Test harness:** `af35fd3`'s `package.json`, `package-lock.json`, and `vite.config.ts` were copied into a detached temporary worktree based on `ef38374`. No implementation files from `af35fd3` were copied.
- **Command:** `NO_COLOR=1 npm test -- --run tests/unit/task-3-behavior.test.ts --reporter=verbose`
- **Exit status:** `1`

The temporary worktree was removed after the run. The actual result was:

```text
× ... exports through the clipboard API before clearing only unpinned context
  → exportAndClearContext is not a function
× ... leaves context intact when the clipboard write fails
  → exportAndClearContext is not a function
✓ ... requires confirmation before clear-all, confirms, and cancels without clearing

Test Files 1 failed (1)
Tests 2 failed | 1 passed (3)
```

This is a genuine red result: the clear-all test already passed against `ef38374`, while both new export behavioral tests failed because the API under test did not exist in that snapshot.

## Green run: current implementation

- **Implementation and test snapshot:** `af35fd30922dfb2cdb4ed4341e34749e282477f` (`af35fd3`)
- **Command:** `NO_COLOR=1 npm test -- --run tests/unit/task-3-behavior.test.ts --reporter=verbose`
- **Exit status:** `0`

The actual result was:

```text
✓ ... exports through the clipboard API before clearing only unpinned context
✓ ... leaves context intact when the clipboard write fails
✓ ... requires confirmation before clear-all, confirms, and cancels without clearing

Test Files 1 passed (1)
Tests 3 passed (3)
```

The red and green commands used the same focused test file and dependency/tooling versions. Only the implementation snapshot differed.
