import type { Target } from '../../types';
import shared from './shared.module.css';

const KIND_LABEL = { meaning: 'New word', form: 'Verb form' } as const;

/** Prompt text with "___" drawn as a blank, plus a small kind label. */
export default function TargetPrompt({
  target,
  prompt,
  index,
}: {
  target: Target;
  prompt: string;
  index: number;
}) {
  const parts = prompt.split('___');
  return (
    <>
      <span className={shared.kind}>{KIND_LABEL[target.kind]}</span>
      <span className={shared.prompt} lang="es">
        <span className={shared.number}>{index + 1}.</span>
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <span className={shared.blank} aria-label="blank">
                ＿＿＿
              </span>
            )}
          </span>
        ))}
      </span>
    </>
  );
}
