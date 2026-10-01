/** A line of history on the page, with the names in it standing out. */

import type { TimelineSentence } from './timeline-wording'

export function SentenceText({ sentence }: { sentence: TimelineSentence }) {
  return (
    <>
      {sentence.map((part, index) =>
        part.strong ? (
          <span key={index} className="font-medium text-foreground">
            {part.text}
          </span>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  )
}
